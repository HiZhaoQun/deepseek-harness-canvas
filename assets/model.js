/**
 * Pure helpers for the canvas. No React, DOM, or Host services.
 */

export const CARD_WIDTH = 472
export const CARD_MIN_ZOOM = 0.25
export const CARD_MAX_ZOOM = 2.5
export const BOARD_VERSION = 2

let counter = 0

export function uid(prefix = 'id') {
  counter = (counter + 1) % 1_000_000
  const random = Math.random().toString(36).slice(2, 9)
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${random}`
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function formatNumber(value) {
  return new Intl.NumberFormat().format(value)
}

export function truncate(text, max) {
  if (typeof text !== 'string') return ''
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

export function normalizeTitle(value, fallback) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return text.length > 0 ? text.slice(0, 160) : fallback
}

export function cardTitle(card, fallback = 'Untitled') {
  if (card === undefined || card === null) return fallback
  if (typeof card.title === 'string' && card.title.trim().length > 0) return card.title.trim()
  if (card.type === 'answer' && typeof card.question === 'string') {
    return truncate(card.question.trim(), 80) || fallback
  }
  return fallback
}

/**
 * Turn one card's content into a Markdown quote suitable for the composer.
 * @param {string} text
 * @param {string} [title]
 * @returns {string}
 */
export function quoteBlock(text, title) {
  const body = truncate(String(text ?? '').trim(), 4_000)
  if (body.length === 0) return ''
  const heading = typeof title === 'string' && title.trim().length > 0 ? `【${title.trim()}】` : ''
  const lines = [heading, ...body.split('\n')].filter((line) => line.length > 0)
  return `\n\n${lines.map((line) => `> ${line}`).join('\n')}\n\n`
}

/**
 * Extract text blocks from a Harness content array.
 * @param {unknown} content
 * @returns {string}
 */
export function extractText(content) {
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
      parts.push(block.text)
    }
  }
  return parts.join('\n\n')
}

export function extractReasoning(content) {
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block?.type === 'reasoning' && typeof block.text === 'string' && block.text.length > 0) {
      parts.push(block.text)
    }
  }
  return parts.join('\n\n')
}

/**
 * Group session events into one Q&A group per human turn.
 *
 * Used by both history import and tests. Events may be either
 * `{ type, data }` or `{ type: 'event', event: { type, data } }`.
 *
 * @param {readonly unknown[]} records
 * @returns {Array<{question: string, content: string, reasoning: string, requestId?: string, status: 'done'|'interrupted'}>}
 */
export function groupHistory(records) {
  const groups = []
  let current

  const finalize = () => {
    if (current === undefined) return
    const content = current.content.trim()
    groups.push({
      question: current.question.trim(),
      content,
      reasoning: current.reasoning.trim(),
      requestId: current.requestId,
      status: content.length > 0 ? 'done' : 'interrupted',
    })
    current = undefined
  }

  for (const record of records ?? []) {
    const event = record?.event ?? record
    if (event === undefined || event === null) continue
    const data = event.data ?? {}

    if (event.type === 'user/message') {
      const source = data.source
      if (source?.kind !== 'user' && source?.kind !== 'user-rpc') continue
      const question = extractText(data.content)
      if (question.trim().length === 0) continue
      if (question.trim().startsWith('/')) continue
      finalize()
      current = {
        question,
        content: '',
        reasoning: '',
        requestId: typeof source.rpcId === 'string' ? source.rpcId : undefined,
      }
      continue
    }

    if (event.type === 'assistant/message' && current !== undefined) {
      const text = extractText(data.message?.content)
      const reasoning = extractReasoning(data.message?.content)
      if (text.length > 0) current.content += `${current.content.length > 0 ? '\n\n' : ''}${text}`
      if (reasoning.length > 0) current.reasoning += `${current.reasoning.length > 0 ? '\n\n' : ''}${reasoning}`
      continue
    }

    if (event.type === 'turn/end') {
      finalize()
    }
  }

  finalize()
  return groups
}

/**
 * Choose a non-overlapping starting position near a world point.
 * @param {Array<object>} cards
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {{x: number, y: number}}
 */
export function freePosition(cards, x, y, width = CARD_WIDTH) {
  let candidateX = x
  let candidateY = y
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const hit = cards.some((card) => (
      Math.abs(card.x - candidateX) < width * 0.7
      && Math.abs(card.y - candidateY) < 180
    ))
    if (!hit) return { x: candidateX, y: candidateY }
    candidateY += 48
    candidateX += 36
  }
  return { x: candidateX, y: candidateY }
}
