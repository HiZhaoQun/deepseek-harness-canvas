/**
 * Session observation for canvas mode.
 *
 * Canvas mode uses the normal Harness composer. This module watches the
 * current Session's event stream: every live human prompt creates a pending
 * answer card, and the assistant response for that turn fills it. No separate
 * prompt endpoint or model loop is used.
 */
import { extractReasoning, extractText } from './model.js?v=2'

const RECONNECT_DELAYS = [600, 1200, 2400, 4800, 8000]

function delay(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}

/**
 * Resolve the generated Session Remote namespace lazily.
 * @param {object} ctx
 */
function sessionRemote(ctx) {
  const remote = ctx.get('remote.session')
  if (remote === undefined) {
    throw new Error('Harness Session Remote is not available yet. Try again once the conversation is ready.')
  }
  return remote
}

function remoteFailureText(error) {
  if (error === undefined || error === null) return 'The Session returned no result.'
  const code = typeof error.code === 'string' ? `[${error.code}] ` : ''
  const message = typeof error.message === 'string' ? error.message : String(error)
  const reason = error.details?.reason ?? error.details?.detail ?? error.details?.path
  return `${code}${message}${reason === undefined ? '' : ` (${String(reason)})`}`
}

function textFromStreamRecords(records) {
  let text = ''
  let reasoning = ''
  if (!Array.isArray(records)) return { text, reasoning }
  for (const record of records) {
    if (record?.type === 'text-chunks' && Array.isArray(record.texts)) text += record.texts.join('')
    else if (record?.type === 'reasoning-chunks' && Array.isArray(record.texts)) reasoning += record.texts.join('')
    else if (record?.type === 'chunk' && record.chunk?.type === 'text-delta') text += record.chunk.text ?? ''
    else if (record?.type === 'chunk' && record.chunk?.type === 'reasoning-delta') reasoning += record.chunk.text ?? ''
  }
  return { text, reasoning }
}

export class CanvasSessionHub {
  /**
   * @param {object} ctx
   * @param {import('./store.js').CanvasStore} store
   * @param {string} sessionId
   */
  constructor(ctx, store, sessionId) {
    this.ctx = ctx
    this.store = store
    this.sessionId = sessionId
    this.disposed = false
    this.live = false
    this.handle = undefined
    this.life = new AbortController()
    this.runPromise = undefined
    this.cursor = undefined
    this.historyRecords = []
    this.seen = new Set()
    this.currentTurn = undefined
    this.byTurn = new Map()
    this.awaiting = []
    this.attempts = new Map()
    this.answerParts = new Map()
    this.answerReasoning = new Map()
  }

  start() {
    if (this.runPromise !== undefined) return
    this.runPromise = this.runLoop()
  }

  async runLoop() {
    let attempt = 0
    while (!this.disposed) {
      const controller = new AbortController()
      const onLifeAbort = () => controller.abort()
      this.life.signal.addEventListener('abort', onLifeAbort, { once: true })
      try {
        const handle = sessionRemote(this.ctx).follow({
          address: { kind: 'session', sessionId: this.sessionId },
          assistantStream: true,
          maxMessages: 120,
          turnWindow: { minMessages: 40, minTurns: 10 },
        }, controller.signal)
        this.handle = handle
        for await (const frame of handle) {
          if (this.disposed) break
          this.acceptFrame(frame)
        }
        attempt = 0
      } catch (error) {
        if (this.disposed) return
        attempt += 1
        if (attempt === 1) {
          this.store.setNotice(`Session stream: ${remoteFailureText(error)}`, 'error')
        }
      } finally {
        this.life.signal.removeEventListener('abort', onLifeAbort)
        this.handle?.dispose?.()
        this.handle = undefined
      }
      if (this.disposed) return
      await delay(RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)], this.life.signal)
    }
  }

  acceptFrame(frame) {
    if (frame === null || typeof frame !== 'object') return
    if (frame.type === 'snapshot') {
      this.cursor = frame.cursor
      for (const record of frame.records ?? []) {
        if (record?.type !== 'event') continue
        this.historyRecords.push(record)
        if (typeof record.event?.seq === 'number') this.seen.add(record.event.seq)
      }
      this.live = true
      return
    }
    if (frame.type === 'assistant-stream') {
      this.acceptAssistantFrame(frame.frame)
      return
    }
    if (frame.type === 'event') {
      this.acceptEvent(frame.event)
    }
  }

  acceptEvent(event) {
    if (event === null || typeof event !== 'object') return
    if (typeof event.seq === 'number') {
      if (this.seen.has(event.seq)) return
      this.seen.add(event.seq)
      this.cursor = this.cursor === undefined ? event.seq : Math.max(this.cursor, event.seq)
    }
    const data = event.data ?? {}

    switch (event.type) {
      case 'turn/start': {
        this.currentTurn = data.turn
        if (this.awaiting.length > 0) {
          const cardId = this.awaiting.shift()
          this.assign(cardId, data.turn)
        }
        break
      }

      case 'user/message': {
        if (!this.live || !this.store.active) break
        if (event.surfaceOp !== undefined && event.surfaceOp !== 'append') break
        const source = data.source
        if (source?.kind !== 'user' && source?.kind !== 'user-rpc') break
        const question = extractText(data.content).trim()
        if (question.length === 0 || question.startsWith('/')) break
        const cardId = this.store.createQuestionCard({
          question,
          requestId: typeof source.rpcId === 'string' ? source.rpcId : undefined,
          parentId: this.store.selection,
        })
        if (this.currentTurn !== undefined && !this.byTurn.has(this.currentTurn)) {
          this.assign(cardId, this.currentTurn)
        } else {
          this.awaiting.push(cardId)
        }
        break
      }

      case 'assistant/message': {
        const cardId = this.byTurn.get(data.turn)
        if (cardId === undefined) break
        const text = extractText(data.message?.content)
        const reasoning = extractReasoning(data.message?.content)
        if (text.length > 0) {
          const parts = this.answerParts.get(cardId) ?? []
          parts.push(text)
          this.answerParts.set(cardId, parts)
          this.store.updateAnswerCard(cardId, { content: parts.join('\n\n') }, true)
        }
        if (reasoning.length > 0) {
          const parts = this.answerReasoning.get(cardId) ?? []
          parts.push(reasoning)
          this.answerReasoning.set(cardId, parts)
          this.store.updateAnswerCard(cardId, { reasoning: parts.join('\n\n') }, true)
        }
        this.store.updateAnswerCard(cardId, {
          status: 'streaming',
          activity: undefined,
          interrupted: data.interrupted === true,
        }, true)
        break
      }

      case 'tool/call': {
        const cardId = this.byTurn.get(data.turn)
        if (cardId !== undefined) {
          this.store.updateAnswerCard(cardId, { status: 'streaming', activity: data.name }, true)
        }
        break
      }

      case 'tool/result': {
        const cardId = this.byTurn.get(data.turn)
        if (cardId !== undefined) this.store.updateAnswerCard(cardId, { activity: undefined }, true)
        break
      }

      case 'turn/end': {
        const cardId = this.byTurn.get(data.turn)
        if (cardId !== undefined) {
          const parts = this.answerParts.get(cardId) ?? []
          const reasoning = this.answerReasoning.get(cardId) ?? []
          const kind = data.reason?.kind ?? 'completed'
          const content = parts.join('\n\n').trim()
          if (content.length > 0) {
            this.store.finishAnswerCard(cardId, {
              content,
              reasoning: reasoning.join('\n\n'),
              status: kind === 'completed' ? 'done' : 'interrupted',
              note: kind === 'completed' ? undefined : kind,
            })
          } else if (kind === 'completed') {
            this.store.finishAnswerCard(cardId, {
              content: '',
              status: 'error',
              error: 'The agent returned an empty answer.',
            })
          } else {
            this.store.finishAnswerCard(cardId, {
              content: '',
              status: kind === 'aborted' || kind === 'interrupted' ? 'interrupted' : 'error',
              error: data.reason?.error?.message ?? String(kind),
            })
          }
          this.byTurn.delete(data.turn)
          this.answerParts.delete(cardId)
          this.answerReasoning.delete(cardId)
        }
        this.currentTurn = undefined
        break
      }

      default:
        break
    }
  }

  acceptAssistantFrame(frame) {
    if (frame === null || typeof frame !== 'object') return
    if (frame.type === 'start') {
      const cardId = this.byTurn.get(frame.turn)
      this.attempts.set(frame.attemptId, {
        turn: frame.turn,
        cardId,
        text: '',
        reasoning: '',
      })
      if (cardId !== undefined) {
        this.store.updateAnswerCard(cardId, {
          status: 'streaming',
          streamText: '',
          reasoning: '',
          activity: undefined,
        }, true)
      }
      return
    }

    if (frame.type === 'chunk') {
      const attempt = this.attempts.get(frame.attemptId)
      if (attempt === undefined) return
      if (attempt.cardId === undefined) {
        const cardId = this.byTurn.get(attempt.turn)
        if (cardId !== undefined) attempt.cardId = cardId
      }
      if (attempt.cardId === undefined) return
      const chunk = frame.chunk
      if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') {
        attempt.text += chunk.text
        this.store.updateAnswerCard(attempt.cardId, {
          status: 'streaming',
          streamText: attempt.text,
        }, true)
      } else if (chunk?.type === 'reasoning-delta' && typeof chunk.text === 'string') {
        attempt.reasoning += chunk.text
        this.store.updateAnswerCard(attempt.cardId, {
          reasoning: attempt.reasoning,
        }, true)
      }
      return
    }

    if (frame.type === 'end') this.attempts.delete(frame.attemptId)
  }

  assign(cardId, turn) {
    if (cardId === undefined || turn === undefined) return
    this.byTurn.set(turn, cardId)
    this.store.markAnswerTurn(cardId, turn)
    this.store.updateAnswerCard(cardId, { status: 'streaming' }, true)
    for (const attempt of this.attempts.values()) {
      if (attempt.turn === turn && attempt.cardId === undefined) {
        attempt.cardId = cardId
        if (attempt.text.length > 0) {
          this.store.updateAnswerCard(cardId, { streamText: attempt.text }, true)
        }
        if (attempt.reasoning.length > 0) {
          this.store.updateAnswerCard(cardId, { reasoning: attempt.reasoning }, true)
        }
      }
    }
  }

  /**
   * Read event records for history import.
   * @param {'recent'|'all'} mode
   * @returns {Promise<readonly unknown[]>}
   */
  async loadHistory(mode) {
    if (this.cursor === undefined) {
      throw new Error('The conversation is still connecting. Try importing again in a moment.')
    }
    const remote = sessionRemote(this.ctx)
    const address = { kind: 'session', sessionId: this.sessionId }
    const base = {
      address,
      throughSeq: this.cursor,
      maxMessages: 200,
      turnWindow: { minMessages: 40, minTurns: 20 },
    }

    const readPage = async (beforeSeq) => {
      const request = beforeSeq === undefined ? base : { ...base, beforeSeq }
      const result = await remote.page(request)
      if (result.ok !== true) {
        throw new Error(remoteFailureText(result.error))
      }
      return result.value
    }

    if (mode !== 'all') {
      try {
        const page = await readPage(undefined)
        return page.records
      } catch {
        return this.historyRecords
      }
    }

    const bySeq = new Map()
    for (const record of this.historyRecords) {
      if (typeof record?.event?.seq === 'number') bySeq.set(record.event.seq, record)
    }

    let beforeSeq
    for (let pageIndex = 0; pageIndex < 80; pageIndex += 1) {
      const page = await readPage(beforeSeq)
      for (const record of page.records) {
        if (typeof record?.event?.seq === 'number') bySeq.set(record.event.seq, record)
      }
      if (!page.hasMore) break
      const seqs = page.records
        .map((record) => record?.event?.seq)
        .filter((seq) => typeof seq === 'number')
      if (seqs.length === 0) break
      const next = Math.min(...seqs)
      if (next === beforeSeq || next <= 1) break
      beforeSeq = next
    }

    return [...bySeq.values()].sort((left, right) => left.event.seq - right.event.seq)
  }

  dispose() {
    this.disposed = true
    this.store.active = false
    this.life.abort()
    try {
      this.handle?.dispose?.()
    } catch {
      // ignore
    }
    this.handle = undefined
  }
}
