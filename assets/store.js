/**
 * Canvas board store for the composer-driven mode.
 *
 * A card is either an answer card (one human turn + assistant response) or a
 * note. The board, selection, and viewport are persisted per Session. Live
 * cards are created by CanvasSessionHub from the Session event stream.
 */
import {
  BOARD_VERSION,
  CARD_MAX_ZOOM,
  CARD_MIN_ZOOM,
  CARD_WIDTH,
  cardTitle,
  clamp,
  freePosition,
  groupHistory,
  quoteBlock,
  truncate,
  uid,
} from './model.js?v=1'
import { CanvasSessionHub } from './sessions.js?v=1'

const SAVE_DELAY = 350

function storageKey(sessionId) {
  return `deepseek-canvas:v1:${sessionId}`
}

function normalizeCard(raw, fromStorage = false) {
  if (raw === null || typeof raw !== 'object') return undefined
  const type = raw.type === 'note' ? 'note' : 'answer'
  const normalized = {
    id: typeof raw.id === 'string' ? raw.id : uid('card'),
    type,
    title: typeof raw.title === 'string' ? raw.title : '',
    question: typeof raw.question === 'string' ? raw.question : '',
    content: typeof raw.content === 'string' ? raw.content : '',
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : '',
    streamText: typeof raw.streamText === 'string' ? raw.streamText : '',
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    x: Number.isFinite(raw.x) ? raw.x : 80,
    y: Number.isFinite(raw.y) ? raw.y : 80,
    width: CARD_WIDTH,
    collapsed: raw.collapsed === true,
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    status: typeof raw.status === 'string' ? raw.status : 'done',
    error: typeof raw.error === 'string' ? raw.error : undefined,
    note: typeof raw.note === 'string' ? raw.note : undefined,
    activity: typeof raw.activity === 'string' ? raw.activity : undefined,
    requestId: typeof raw.requestId === 'string' ? raw.requestId : undefined,
    turn: Number.isFinite(raw.turn) ? raw.turn : undefined,
    imported: raw.imported === true,
  }

  // Migrate the old paper/repository cards to notes. Uploads and repository
  // selection no longer exist, but their text should not disappear.
  if (raw.type !== 'answer' && raw.type !== 'note') {
    normalized.type = 'note'
    normalized.title = typeof raw.title === 'string' && raw.title.length > 0 ? raw.title : 'Imported card'
    normalized.content = typeof raw.content === 'string' ? raw.content : ''
    normalized.status = 'done'
    normalized.imported = true
  }

  if (fromStorage && (normalized.status === 'waiting' || normalized.status === 'streaming')) {
    normalized.status = 'error'
    normalized.error = 'This card was interrupted before the page was reloaded.'
  }
  return normalized
}

export class CanvasStore {
  /**
   * @param {object} ctx
   * @param {string} sessionId
   */
  constructor(ctx, sessionId) {
    this.ctx = ctx
    this.sessionId = sessionId
    this.listeners = new Set()
    this.revision = 0
    this.loaded = false
    this.active = false
    this.disposed = false
    this.board = {
      version: BOARD_VERSION,
      viewport: { x: 0, y: 0, zoom: 1 },
      cards: [],
      controlsOpen: true,
    }
    this.size = { width: 1000, height: 700 }
    this.heights = new Map()
    this.selection = undefined
    this.lastQuoteCardId = undefined
    this.readerCardId = undefined
    this.notice = undefined
    this.helpOpen = false
    this.importing = false
    this.inputActions = undefined
    this.saveTimer = undefined
    this.frame = undefined
    this.noticeTimer = undefined
    this.storageWarned = false
    this.hub = new CanvasSessionHub(ctx, this, sessionId)
  }

  subscribe = (listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getRevision = () => this.revision

  get cards() {
    return this.board.cards
  }

  get viewport() {
    return this.board.viewport
  }

  get controlsOpen() {
    return this.board.controlsOpen !== false
  }

  setControlsOpen(value) {
    this.board.controlsOpen = value
    this.touch()
  }

  setInputActions(inputActions) {
    this.inputActions = inputActions
  }

  cardById(id) {
    return this.board.cards.find((card) => card.id === id)
  }

  childrenOf(id) {
    return this.board.cards.filter((card) => card.parentId === id)
  }

  findCardByRequestId(requestId) {
    return this.board.cards.find((card) => card.requestId === requestId)
  }

  async activate() {
    if (!this.loaded) {
      this.load()
      this.loaded = true
      this.active = true
      this.touch(false)
      this.hub.start()
      return
    }
    this.active = true
    this.touch(false)
  }

  deactivate() {
    if (!this.loaded || this.disposed) return
    this.active = false
    this.touch(false)
  }

  load() {
    let parsed
    try {
      const raw = localStorage.getItem(storageKey(this.sessionId))
      if (raw !== null) parsed = JSON.parse(raw)
    } catch {
      parsed = undefined
    }
    if (parsed !== undefined && parsed !== null && Array.isArray(parsed.cards)) {
      const cards = parsed.cards
        .map((card) => normalizeCard(card, true))
        .filter((card) => card !== undefined)
      const viewport = parsed.viewport ?? {}
      this.board = {
        version: BOARD_VERSION,
        viewport: {
          x: Number.isFinite(viewport.x) ? viewport.x : 0,
          y: Number.isFinite(viewport.y) ? viewport.y : 0,
          zoom: clamp(Number.isFinite(viewport.zoom) ? viewport.zoom : 1, CARD_MIN_ZOOM, CARD_MAX_ZOOM),
        },
        cards,
        controlsOpen: parsed.controlsOpen !== false,
      }
      return
    }
    this.board = {
      version: BOARD_VERSION,
      viewport: { x: 0, y: 0, zoom: 1 },
      cards: [],
      controlsOpen: true,
    }
  }

  save() {
    if (this.disposed) return
    const payload = JSON.stringify({
      version: BOARD_VERSION,
      viewport: this.board.viewport,
      cards: this.board.cards,
      controlsOpen: this.controlsOpen,
    })
    try {
      localStorage.setItem(storageKey(this.sessionId), payload)
      this.storageWarned = false
    } catch {
      if (this.storageWarned) return
      this.storageWarned = true
      this.notice = {
        id: uid('notice'),
        kind: 'error',
        message: 'Canvas storage is full. Delete some cards or clear the canvas.',
      }
      this.revision += 1
      this.emit()
    }
  }

  scheduleSave() {
    if (this.saveTimer !== undefined) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined
      this.save()
    }, SAVE_DELAY)
  }

  emit() {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // Keep other subscribers alive.
      }
    }
  }

  touch(persist = true) {
    if (this.disposed) return
    this.revision += 1
    this.emit()
    if (persist) this.scheduleSave()
  }

  touchLive() {
    if (this.disposed) return
    if (this.frame !== undefined) return
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined
      if (this.disposed) return
      this.revision += 1
      this.emit()
    })
    this.scheduleSave()
  }

  setCanvasSize(width, height) {
    if (width <= 0 || height <= 0) return
    if (this.size.width === width && this.size.height === height) return
    this.size = { width, height }
  }

  setViewport(next) {
    const viewport = this.board.viewport
    let changed = false
    if (Number.isFinite(next.x) && next.x !== viewport.x) {
      viewport.x = next.x
      changed = true
    }
    if (Number.isFinite(next.y) && next.y !== viewport.y) {
      viewport.y = next.y
      changed = true
    }
    if (Number.isFinite(next.zoom)) {
      const zoom = clamp(next.zoom, CARD_MIN_ZOOM, CARD_MAX_ZOOM)
      if (zoom !== viewport.zoom) {
        viewport.zoom = zoom
        changed = true
      }
    }
    if (changed) this.touch(true)
  }

  panBy(dx, dy) {
    this.setViewport({ x: this.viewport.x + dx, y: this.viewport.y + dy })
  }

  zoomAt(clientX, clientY, factor, rect) {
    const viewport = this.board.viewport
    const zoom = clamp(viewport.zoom * factor, CARD_MIN_ZOOM, CARD_MAX_ZOOM)
    if (zoom === viewport.zoom) return
    const x = clientX - rect.left
    const y = clientY - rect.top
    const worldX = (x - viewport.x) / viewport.zoom
    const worldY = (y - viewport.y) / viewport.zoom
    viewport.x = x - worldX * zoom
    viewport.y = y - worldY * zoom
    viewport.zoom = zoom
    this.touch(true)
  }

  zoomBy(factor) {
    this.zoomAt(this.size.width / 2, this.size.height / 2, factor, {
      left: 0,
      top: 0,
      width: this.size.width,
      height: this.size.height,
    })
  }

  resetZoom() {
    const viewport = this.board.viewport
    const worldX = (this.size.width / 2 - viewport.x) / viewport.zoom
    const worldY = (this.size.height / 2 - viewport.y) / viewport.zoom
    viewport.zoom = 1
    viewport.x = this.size.width / 2 - worldX
    viewport.y = this.size.height / 2 - worldY
    this.touch(true)
  }

  fit() {
    if (this.board.cards.length === 0) {
      this.board.viewport = { x: 0, y: 0, zoom: 1 }
      this.touch(true)
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const card of this.board.cards) {
      const height = this.heights.get(card.id) ?? 260
      minX = Math.min(minX, card.x)
      minY = Math.min(minY, card.y)
      maxX = Math.max(maxX, card.x + (card.width ?? CARD_WIDTH))
      maxY = Math.max(maxY, card.y + height)
    }
    const padding = 120
    const width = Math.max(1, maxX - minX)
    const height = Math.max(1, maxY - minY)
    const zoom = clamp(Math.min(
      (this.size.width - padding * 2) / width,
      (this.size.height - padding * 2) / height,
      1.15,
    ), CARD_MIN_ZOOM, CARD_MAX_ZOOM)
    this.board.viewport = {
      zoom,
      x: (this.size.width - width * zoom) / 2 - minX * zoom,
      y: (this.size.height - height * zoom) / 2 - minY * zoom,
    }
    this.touch(true)
  }

  setHeight(cardId, height) {
    const previous = this.heights.get(cardId)
    if (previous !== undefined && Math.abs(previous - height) < 1.5) return
    this.heights.set(cardId, height)
    this.touchLive()
  }

  select(cardId) {
    if (this.selection === cardId) return
    this.selection = cardId
    this.touch(false)
  }

  setHelpOpen(value) {
    this.helpOpen = value
    this.touch(false)
  }

  openReader(cardId) {
    if (this.cardById(cardId) === undefined) return
    this.selection = cardId
    this.readerCardId = cardId
    this.touch(false)
  }

  closeReader() {
    if (this.readerCardId === undefined) return
    this.readerCardId = undefined
    this.touch(false)
  }

  setNotice(message, kind = 'info') {
    if (this.disposed) return
    if (this.noticeTimer !== undefined) clearTimeout(this.noticeTimer)
    this.notice = { message, kind, id: uid('notice') }
    this.touchLive()
    this.noticeTimer = setTimeout(() => {
      this.notice = undefined
      this.touch(false)
    }, 4200)
  }

  addCard(partial) {
    const card = normalizeCard({
      id: uid('card'),
      type: 'note',
      x: this.viewportCenter().x,
      y: this.viewportCenter().y,
      ...partial,
    })
    this.board.cards.push(card)
    this.touch()
    return card
  }

  updateCard(cardId, patch) {
    const card = this.cardById(cardId)
    if (card === undefined) return
    Object.assign(card, patch)
    this.touch()
  }

  updateCardLive(cardId, patch) {
    const card = this.cardById(cardId)
    if (card === undefined) return
    Object.assign(card, patch)
    this.touchLive()
  }

  createQuestionCard({ question, requestId, parentId }) {
    const resolvedParentId = typeof parentId === 'string' ? parentId : this.lastQuoteCardId
    const parent = typeof resolvedParentId === 'string' ? this.cardById(resolvedParentId) : undefined
    const position = parent === undefined
      ? freePosition(this.board.cards, this.viewportCenter().x, this.viewportCenter().y)
      : this.childPosition(parent)
    const card = this.addCard({
      type: 'answer',
      title: truncate(question, 90),
      question,
      content: '',
      reasoning: '',
      parentId: parent?.id ?? null,
      requestId,
      status: 'waiting',
      x: position.x,
      y: position.y,
    })
    this.selection = card.id
    this.lastQuoteCardId = undefined
    this.touch()
    return card.id
  }

  markAnswerTurn(cardId, turn) {
    this.updateCardLive(cardId, { turn })
  }

  updateAnswerCard(cardId, patch, live = false) {
    const card = this.cardById(cardId)
    if (card === undefined) return
    Object.assign(card, patch)
    if (live) this.touchLive()
    else this.touch()
  }

  finishAnswerCard(cardId, { content, reasoning, status, error, note }) {
    const card = this.cardById(cardId)
    if (card === undefined) return
    Object.assign(card, {
      content: content ?? '',
      reasoning: reasoning ?? '',
      streamText: '',
      activity: undefined,
      status,
      error,
      note,
    })
    this.touch()
  }

  addNote(parentId = this.selection) {
    const parent = typeof parentId === 'string' ? this.cardById(parentId) : undefined
    const position = parent === undefined
      ? freePosition(this.board.cards, this.viewportCenter().x, this.viewportCenter().y)
      : this.childPosition(parent)
    const card = this.addCard({
      type: 'note',
      title: '',
      content: '',
      parentId: parent?.id ?? null,
      status: 'done',
      x: position.x,
      y: position.y,
    })
    this.selection = card.id
    this.touch()
    return card
  }

  quoteCard(card) {
    if (card === undefined) return
    this.select(card.id)
    const text = card.content.length > 0 ? card.content : card.question
    this.insertQuote(text, cardTitle(card, ''), card.id)
  }

  /**
   * Insert a quote at the current composer selection. This is the bridge
   * between selecting text on a card and the normal Harness input box.
   */
  insertQuote(text, title, cardId) {
    if (typeof cardId === 'string') this.lastQuoteCardId = cardId
    const body = truncate(String(text ?? '').trim(), 4_000)
    if (body.length === 0) return false
    const heading = typeof title === 'string' && title.trim().length > 0 ? `【${title.trim()}】\n` : ''
    const value = `${heading}${body}`
    try {
      const actions = this.inputActions
      if (actions !== undefined && typeof actions.insertQuote === 'function') {
        if (actions.insertQuote(value) === true) {
          actions.focus?.()
          this.setNotice('已引用到输入框', 'success')
          return true
        }
      }
      if (actions !== undefined
        && typeof actions.captureInsertion === 'function'
        && typeof actions.insertText === 'function') {
        const span = actions.captureInsertion()
        if (span !== undefined && actions.insertText(value, span) === true) {
          actions.focus?.()
          this.setNotice('已引用到输入框', 'success')
          return true
        }
      }
      throw new Error('Composer is not accepting a quote')
    } catch {
      try {
        navigator.clipboard?.writeText(quoteBlock(body, title)).catch(() => {})
      } catch {
        // ignore
      }
      this.setNotice('无法自动插入，内容已尝试复制到剪贴板', 'error')
      return false
    }
  }

  async importHistory(mode = 'recent') {
    if (this.importing) return
    this.importing = true
    this.setNotice('正在导入当前对话…', 'info')
    try {
      const records = await this.hub.loadHistory(mode)
      const groups = groupHistory(records)
      const existing = new Set(this.board.cards.map((card) => card.requestId).filter(Boolean))
      const fresh = groups.filter((group) => group.requestId === undefined || !existing.has(group.requestId))
      if (fresh.length === 0) {
        this.setNotice('当前对话没有可导入的新消息', 'info')
        return
      }

      let previous
      let rootPosition
      if (this.board.cards.length === 0) {
        rootPosition = this.viewportCenter()
      } else {
        const maxX = Math.max(...this.board.cards.map((card) => card.x + (card.width ?? CARD_WIDTH)))
        const minY = Math.min(...this.board.cards.map((card) => card.y))
        rootPosition = freePosition(this.board.cards, maxX + 120, minY)
      }

      for (const group of fresh) {
        const parent = previous
        const position = parent === undefined
          ? rootPosition
          : { x: parent.x, y: parent.y + 380 }
        const card = this.addCard({
          type: 'answer',
          title: truncate(group.question, 90),
          question: group.question,
          content: group.content,
          reasoning: group.reasoning,
          parentId: parent?.id ?? null,
          requestId: group.requestId,
          status: group.status,
          imported: true,
          x: position.x,
          y: position.y,
          createdAt: Date.now(),
        })
        previous = card
      }
      this.selection = previous?.id
      this.touch()
      this.fit()
      this.setNotice(`已导入 ${fresh.length} 轮对话`, 'success')
    } catch (error) {
      this.setNotice(error?.message ?? String(error), 'error')
    } finally {
      this.importing = false
      this.touch(false)
    }
  }

  deleteCard(cardId) {
    const card = this.cardById(cardId)
    if (card === undefined) return
    const index = this.board.cards.indexOf(card)
    if (index >= 0) this.board.cards.splice(index, 1)
    for (const child of this.board.cards) {
      if (child.parentId === cardId) child.parentId = card.parentId ?? null
    }
    if (this.selection === cardId) this.selection = undefined
    if (this.lastQuoteCardId === cardId) this.lastQuoteCardId = undefined
    if (this.readerCardId === cardId) this.readerCardId = undefined
    this.touch()
    this.setNotice('卡片已删除', 'info')
  }

  clear() {
    this.board.cards = []
    this.selection = undefined
    this.lastQuoteCardId = undefined
    this.readerCardId = undefined
    this.touch()
    this.setNotice('画布已清空', 'info')
  }

  viewportCenter() {
    const viewport = this.board.viewport
    return {
      x: (this.size.width / 2 - viewport.x) / viewport.zoom - CARD_WIDTH / 2,
      y: (this.size.height / 2 - viewport.y) / viewport.zoom - 120,
    }
  }

  childPosition(parent) {
    const siblings = this.childrenOf(parent.id)
    const parentHeight = this.heights.get(parent.id) ?? 280
    const x = parent.x + (parent.width - CARD_WIDTH) / 2 + siblings.length * 36
    const y = parent.y + parentHeight + 96 + siblings.length * 28
    return freePosition(this.board.cards, x, y)
  }

  dispose() {
    if (this.saveTimer !== undefined) clearTimeout(this.saveTimer)
    if (this.noticeTimer !== undefined) clearTimeout(this.noticeTimer)
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    this.save()
    this.disposed = true
    this.active = false
    this.hub.dispose()
    this.listeners.clear()
  }
}
