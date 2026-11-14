/**
 * Canvas board store for the composer-driven mode.
 *
 * A card is either an answer card (one human turn + assistant response) or a
 * note. The board, selection, and viewport are persisted per Session. Live
 * cards are created by CanvasSessionHub from the Session event stream.
 */
import {
  BOARD_VERSION,
  CARD_GAP,
  CARD_HEIGHT,
  CARD_MAX_ZOOM,
  CARD_MIN_ZOOM,
  CARD_WIDTH,
  EXPANDED_HEIGHT,
  EXPANDED_WIDTH,
  cardHeight,
  cardTitle,
  cardWidth,
  clamp,
  freePosition,
  groupHistory,
  quoteBlock,
  slotColumnAt,
  slotRowAt,
  slotXAt,
  slotYAt,
  truncate,
  uid,
} from './model.js?v=6'
import { CanvasSessionHub } from './sessions.js?v=6'

const SAVE_DELAY = 350
const SCROLL_SURFACES = ['body', 'reader']

function storageKey(sessionId) {
  return `deepseek-canvas:v1:${sessionId}`
}

/**
 * Sanitize one card's persisted reading positions. `top` is the pixel offset
 * that resumes the exact same layout; `ratio` lets a different surface (for
 * example the full-screen reader opened from a card preview) continue from the
 * same relative place when no position of its own exists yet.
 * @param {unknown} raw
 * @returns {{body?: {top: number, ratio: number}, reader?: {top: number, ratio: number}} | undefined}
 */
function normalizeScrollMemory(raw) {
  if (raw === null || typeof raw !== 'object') return undefined
  const memory = {}
  for (const surface of SCROLL_SURFACES) {
    const value = raw[surface]
    if (value === null || typeof value !== 'object') continue
    if (!Number.isFinite(value.top) && !Number.isFinite(value.ratio)) continue
    memory[surface] = {
      top: Math.max(0, Number.isFinite(value.top) ? value.top : 0),
      ratio: clamp(Number.isFinite(value.ratio) ? value.ratio : 0, 0, 1),
    }
  }
  return Object.keys(memory).length > 0 ? memory : undefined
}

function normalizeCard(raw, fromStorage = false) {
  if (raw === null || typeof raw !== 'object') return undefined
  const type = raw.type === 'note' ? 'note' : 'answer'
  const normalized = {
    id: typeof raw.id === 'string' ? raw.id : uid('card'),
    type,
    // Answer cards derive their title from the full question; storing a
    // truncated copy was cutting the visible title short.
    title: type === 'answer' ? '' : (typeof raw.title === 'string' ? raw.title : ''),
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
      collapseAll: true,
      snapToGrid: true,
    }
    this.size = { width: 1000, height: 700 }
    this.scrolls = new Map()
    this.selection = undefined
    this.lastQuoteCardId = undefined
    this.readerCardId = undefined
    this.draggingCardId = undefined
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

  /** Global collapse mode: all cards collapsed, and new answer cards too. */
  get collapseAll() {
    return this.board.collapseAll !== false
  }

  /**
   * Collapse or expand every card and remember the choice for new cards.
   * Collapsing is position-preserving; expanding gives every card a free 2x2
   * block so collapsed and expanded cards coexist on the same lattice.
   * @param {boolean} value
   */
  setCollapseAll(value) {
    const next = value === true
    if (this.collapseAll === next) return
    this.board.collapseAll = next
    if (next === false && this.snapToGrid && this.cards.length > 0) {
      const ordered = [...this.cards].sort((left, right) => (left.y - right.y) || (left.x - right.x))
      const placed = []
      for (const card of ordered) {
        card.collapsed = false
        const anchor = this.nearestFreeAnchor(
          card.x,
          card.y,
          EXPANDED_WIDTH,
          EXPANDED_HEIGHT,
          undefined,
          placed,
        )
        card.x = anchor.x
        card.y = anchor.y
        placed.push(card)
      }
      this.touch()
      return
    }
    for (const card of this.cards) card.collapsed = next
    this.touch()
  }

  /** Whether new cards and drops snap to the preset grid. */
  get snapToGrid() {
    return this.board.snapToGrid !== false
  }

  /**
   * Turn magnetic grid snapping on or off. Turning it on also lays the current
   * cards out on the nearest preset slots; turning it off leaves positions as
   * they are so free dragging works again.
   * @param {boolean} value
   */
  setSnapToGrid(value) {
    const next = value === true
    if (this.snapToGrid === next) return
    this.board.snapToGrid = next
    if (next) this.alignToSlots()
    else this.touch()
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
      // Cards are uniform 4:3 tiles now. Existing boards may still hold
      // positions from the old variable-height layout, so align them once on
      // first open when snapping is on.
      if (this.snapToGrid) this.alignToSlots()
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
    this.draggingCardId = undefined
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
      const scrolls = new Map()
      const storedScrolls = parsed.scrolls
      if (storedScrolls !== null && typeof storedScrolls === 'object') {
        for (const card of cards) {
          const memory = normalizeScrollMemory(storedScrolls[card.id])
          if (memory !== undefined) scrolls.set(card.id, memory)
        }
      }
      // Boards saved before the collapse switch existed start collapsed, which
      // also keeps their first load cheap: no live streaming re-renders.
      const legacyCollapse = parsed.collapseAll === undefined
      if (legacyCollapse) {
        for (const card of cards) card.collapsed = true
      }
      this.board = {
        version: BOARD_VERSION,
        viewport: {
          x: Number.isFinite(viewport.x) ? viewport.x : 0,
          y: Number.isFinite(viewport.y) ? viewport.y : 0,
          zoom: clamp(Number.isFinite(viewport.zoom) ? viewport.zoom : 1, CARD_MIN_ZOOM, CARD_MAX_ZOOM),
        },
        cards,
        controlsOpen: parsed.controlsOpen !== false,
        collapseAll: parsed.collapseAll !== false,
        snapToGrid: parsed.snapToGrid !== false,
      }
      this.scrolls = scrolls
      return
    }
    this.board = {
      version: BOARD_VERSION,
      viewport: { x: 0, y: 0, zoom: 1 },
      cards: [],
      controlsOpen: true,
      collapseAll: true,
      snapToGrid: true,
    }
    this.scrolls = new Map()
  }

  save() {
    if (this.disposed) return
    const payload = JSON.stringify({
      version: BOARD_VERSION,
      viewport: this.board.viewport,
      cards: this.board.cards,
      scrolls: Object.fromEntries(this.scrolls),
      controlsOpen: this.controlsOpen,
      collapseAll: this.collapseAll,
      snapToGrid: this.snapToGrid,
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
      const width = cardWidth(card)
      const height = cardHeight(card)
      minX = Math.min(minX, card.x)
      minY = Math.min(minY, card.y)
      maxX = Math.max(maxX, card.x + width)
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

  /**
   * Whether a footprint at (x, y) is free, ignoring one card and optionally
   * only checking a subset of cards (used while re-aligning the board).
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {string | undefined} ignoreId
   * @param {Array<object>} [cards]
   * @returns {boolean}
   */
  footprintFree(x, y, width, height, ignoreId, cards = this.cards) {
    for (const card of cards) {
      if (card.id === ignoreId) continue
      const otherWidth = cardWidth(card)
      const otherHeight = cardHeight(card)
      if (x < card.x + otherWidth && x + width > card.x
        && y < card.y + otherHeight && y + height > card.y) {
        return false
      }
    }
    return true
  }

  /**
   * Nearest free preset anchor for a footprint. Rings are searched outward so
   * the magnetic target is the closest available position.
   * @param {number} desiredX
   * @param {number} desiredY
   * @param {number} width
   * @param {number} height
   * @param {string | undefined} ignoreId
   * @param {Array<object>} [cards]
   * @returns {{x: number, y: number}}
   */
  nearestFreeAnchor(desiredX, desiredY, width, height, ignoreId, cards = this.cards) {
    const column = slotColumnAt(desiredX)
    const row = slotRowAt(desiredY)
    for (let radius = 0; radius <= 20; radius += 1) {
      let best
      let bestDistance = Infinity
      for (let dc = -radius; dc <= radius; dc += 1) {
        for (let dr = -radius; dr <= radius; dr += 1) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue
          const x = slotXAt(column + dc)
          const y = slotYAt(row + dr)
          if (!this.footprintFree(x, y, width, height, ignoreId, cards)) continue
          const distance = (x - desiredX) ** 2 + (y - desiredY) ** 2
          if (distance < bestDistance) {
            bestDistance = distance
            best = { x, y }
          }
        }
      }
      if (best !== undefined) return best
    }
    return { x: slotXAt(column), y: slotYAt(row) }
  }

  /**
   * Position for a new card: below its parent, or near the viewport centre for
   * a root card. Free placement is used when snapping is off.
   * @param {object | undefined} parent
   * @param {boolean} collapsed
   * @returns {{x: number, y: number}}
   */
  placementFor(parent, collapsed) {
    if (!this.snapToGrid) {
      if (parent !== undefined) return this.childPosition(parent)
      const center = this.viewportCenter()
      return freePosition(this.cards, center.x, center.y)
    }
    const width = collapsed ? CARD_WIDTH : EXPANDED_WIDTH
    const height = collapsed ? CARD_HEIGHT : EXPANDED_HEIGHT
    if (parent !== undefined) {
      return this.nearestFreeAnchor(
        parent.x,
        parent.y + cardHeight(parent) + CARD_GAP,
        width,
        height,
        undefined,
      )
    }
    const center = this.viewportCenter()
    return this.nearestFreeAnchor(center.x, center.y, width, height, undefined)
  }

  /**
   * Snap one card to the nearest free preset anchor; called after a drag ends.
   * @param {string} cardId
   */
  snapCard(cardId) {
    if (!this.snapToGrid) return
    const card = this.cardById(cardId)
    if (card === undefined) return
    const anchor = this.nearestFreeAnchor(
      card.x,
      card.y,
      cardWidth(card),
      cardHeight(card),
      card.id,
    )
    if (Math.abs(anchor.x - card.x) < 1 && Math.abs(anchor.y - card.y) < 1) return
    card.x = anchor.x
    card.y = anchor.y
    this.touch()
  }

  /**
   * Move every card onto a free preset anchor, preserving reading order.
   * Mixed collapsed and expanded cards are supported.
   */
  alignToSlots() {
    if (this.disposed) return
    if (this.snapToGrid && this.cards.length > 0) {
      const ordered = [...this.cards].sort((left, right) => (left.y - right.y) || (left.x - right.x))
      const placed = []
      for (const card of ordered) {
        const anchor = this.nearestFreeAnchor(
          card.x,
          card.y,
          cardWidth(card),
          cardHeight(card),
          undefined,
          placed,
        )
        card.x = anchor.x
        card.y = anchor.y
        placed.push(card)
      }
    }
    this.touch()
  }

  /**
   * Card being dragged, so the board can show the preset slot grid.
   * @param {string | undefined} cardId
   */
  setDraggingCard(cardId) {
    const next = typeof cardId === 'string' ? cardId : undefined
    if (this.draggingCardId === next) return
    this.draggingCardId = next
    this.touch(false)
  }

  /**
   * Persisted reading position of one card surface.
   * @param {string} cardId
   * @param {'body' | 'reader'} surface
   * @returns {{top: number, ratio: number} | undefined}
   */
  scrollMemory(cardId, surface) {
    return this.scrolls.get(cardId)?.[surface]
  }

  /**
   * Remember where the user stopped reading. This runs from scroll events, so
   * it deliberately does not bump the revision (that would re-render the whole
   * board); the debounced board save batches the localStorage write.
   * @param {string} cardId
   * @param {'body' | 'reader'} surface
   * @param {HTMLElement} element - the scroll container.
   */
  rememberScroll(cardId, surface, element) {
    if (this.disposed || typeof cardId !== 'string') return
    if (element === null || element === undefined) return
    if (this.cardById(cardId) === undefined) return
    const top = Number.isFinite(element.scrollTop) ? Math.max(0, element.scrollTop) : 0
    const max = Math.max(0, (element.scrollHeight ?? 0) - (element.clientHeight ?? 0))
    const ratio = max > 0 ? clamp(top / max, 0, 1) : 0
    const entry = this.scrolls.get(cardId) ?? {}
    const previous = entry[surface]
    if (previous !== undefined
      && Math.abs(previous.top - top) < 1
      && Math.abs(previous.ratio - ratio) < 0.004) {
      return
    }
    entry[surface] = { top, ratio }
    this.scrolls.set(cardId, entry)
    this.scheduleSave()
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

  /**
   * Collapse or expand one card. Expanding needs a free 2x2 block, so the card
   * may move to the nearest free one; collapsing keeps its position.
   * @param {string} cardId
   * @param {boolean} collapsed
   */
  setCardCollapsed(cardId, collapsed) {
    const card = this.cardById(cardId)
    if (card === undefined || card.collapsed === collapsed) return
    if (collapsed === false && this.snapToGrid) {
      const anchor = this.nearestFreeAnchor(
        card.x,
        card.y,
        EXPANDED_WIDTH,
        EXPANDED_HEIGHT,
        card.id,
      )
      card.x = anchor.x
      card.y = anchor.y
    }
    card.collapsed = collapsed
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
    const collapsed = this.collapseAll
    const position = this.placementFor(parent, collapsed)
    const card = this.addCard({
      type: 'answer',
      title: '',
      question,
      content: '',
      reasoning: '',
      parentId: parent?.id ?? null,
      requestId,
      status: 'waiting',
      collapsed,
      x: position.x,
      y: position.y,
    })
    this.selection = card.id
    this.lastQuoteCardId = undefined
    this.touch()
    return card.id
  }

  markAnswerTurn(cardId, turn) {
    this.updateAnswerCard(cardId, { turn }, true)
  }

  /**
   * Update an answer card from the Session stream. A collapsed card has no
   * visible live surface, so content chunks update it silently: no board
   * re-render and no storage write per chunk. Status and tool activity still
   * emit once so the collapsed header stays truthful.
   */
  updateAnswerCard(cardId, patch, live = false) {
    const card = this.cardById(cardId)
    if (card === undefined) return
    const statusChanged = 'status' in patch && patch.status !== card.status
    const activityChanged = 'activity' in patch && patch.activity !== card.activity
    Object.assign(card, patch)
    if (!live) {
      this.touch()
      return
    }
    if (card.collapsed && !statusChanged && !activityChanged) return
    this.touchLive()
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
    // A note is created to be typed into, so it starts expanded even when the
    // global collapse switch is on.
    const position = this.placementFor(parent, false)
    const card = this.addCard({
      type: 'note',
      title: '',
      content: '',
      parentId: parent?.id ?? null,
      status: 'done',
      collapsed: false,
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
    // The card title is now the full question, so the quote heading needs its
    // own short label instead of pushing the whole question into the input.
    const safeTitle = truncate(String(title ?? '').trim(), 60)
    const heading = safeTitle.length > 0 ? `【${safeTitle}】\n` : ''
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
        navigator.clipboard?.writeText(quoteBlock(body, safeTitle)).catch(() => {})
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
        const maxX = Math.max(...this.board.cards.map((card) => card.x + cardWidth(card)))
        const minY = Math.min(...this.board.cards.map((card) => card.y))
        rootPosition = freePosition(this.board.cards, maxX + CARD_GAP + 56, minY)
      }

      for (const group of fresh) {
        const parent = previous
        const collapsed = this.collapseAll
        let position
        if (this.snapToGrid) {
          const width = collapsed ? CARD_WIDTH : EXPANDED_WIDTH
          const height = collapsed ? CARD_HEIGHT : EXPANDED_HEIGHT
          position = this.nearestFreeAnchor(
            parent === undefined ? rootPosition.x : parent.x,
            parent === undefined
              ? rootPosition.y
              : parent.y + cardHeight(parent) + CARD_GAP,
            width,
            height,
            undefined,
          )
        } else {
          position = parent === undefined
            ? rootPosition
            : { x: parent.x, y: parent.y + cardHeight(parent) + 96 }
        }
        const card = this.addCard({
          type: 'answer',
          title: '',
          question: group.question,
          content: group.content,
          reasoning: group.reasoning,
          parentId: parent?.id ?? null,
          requestId: group.requestId,
          status: group.status,
          imported: true,
          collapsed,
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
    if (this.draggingCardId === cardId) this.draggingCardId = undefined
    this.scrolls.delete(cardId)
    this.touch()
    this.setNotice('卡片已删除', 'info')
  }

  clear() {
    this.board.cards = []
    this.selection = undefined
    this.lastQuoteCardId = undefined
    this.readerCardId = undefined
    this.draggingCardId = undefined
    this.scrolls.clear()
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
    const parentHeight = cardHeight(parent)
    const x = parent.x + (cardWidth(parent) - CARD_WIDTH) / 2 + siblings.length * 36
    const y = parent.y + parentHeight + CARD_GAP + siblings.length * 28
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
