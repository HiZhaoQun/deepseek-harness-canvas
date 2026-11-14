/**
 * Localized copy for Canvas mode.
 */
import { useSyncExternalStore } from './runtime.js?v=6'

// Versioned namespace: new keys must not be resolved from an older cached
// registration of the same namespace.
export const UI_NS = 'deepseekCanvasUiV2'

const EN = {
  'app.title': 'DeepSeek Canvas',
  'app.subtitle': 'Chat as a connected card tree',
  'boot.loading': 'Opening canvas…',

  'toolbar.import': 'Import chat',
  'toolbar.importRecent': 'Recent 20 turns',
  'toolbar.importAll': 'Full history',
  'toolbar.importing': 'Importing…',
  'toolbar.note': 'New note',
  'toolbar.collapseAll': 'Collapse all cards',
  'toolbar.snap': 'Magnetic grid',
  'toolbar.fit': 'Fit view',
  'toolbar.help': 'Help',
  'controls.collapse': 'Collapse controls',
  'controls.expand': 'Expand controls',
  'toolbar.helpTitle': 'Canvas mode',
  'toolbar.helpBody': 'Use the normal input box below. Select a card first to continue from that point; the answer becomes a child card. With no card selected, drag or use the wheel anywhere — even on a card — to pan the canvas. Select text inside a selected card to quote it. Ctrl/⌘ + wheel zooms. Cards are collapsed by default; collapsed cards skip live streaming so the board stays smooth. Magnetic grid lines up new and dropped cards.',
  'toolbar.zoomIn': 'Zoom in',
  'toolbar.zoomOut': 'Zoom out',
  'toolbar.zoomReset': 'Reset zoom to 100%',
  'zoom.fit': 'Fit',

  'empty.title': 'Start from a question',
  'empty.desc': 'Canvas mode turns the normal conversation into connected cards. Type in the input box below to create a root card, or select an existing card to continue from it. Importing history is optional.',
  'empty.importRecent': 'Import recent chat',
  'empty.importAll': 'Import full history',
  'empty.note': 'New note',

  'card.answer': 'Answer',
  'card.note': 'Note',
  'card.untitled': 'Untitled',
  'card.parent': 'From: {title}',
  'card.children': '{count} linked',
  'card.expand': 'Expand',
  'card.collapse': 'Collapse',
  'card.copy': 'Copy content',
  'card.quote': 'Quote into input',
  'card.newNote': 'New child note',
  'card.menu': 'Card actions',
  'card.delete': 'Delete card',
  'card.waiting': 'Waiting for the agent…',
  'card.streaming': 'Generating…',
  'card.done': 'Done',
  'card.error': 'Error',
  'card.interrupted': 'Interrupted',
  'card.empty': 'The agent returned an empty answer.',
  'card.reasoning': 'Reasoning',
  'card.usingTool': 'Using {name}…',
  'card.read': 'Read in full',
  'reader.you': 'You',
  'reader.assistant': 'Assistant',

  'mode.current': 'Current point: {title}',
  'mode.none': 'No point selected — the next message creates a root card',
  'mode.hint': 'Use the input box below',
  'mode.noteHint': ' · quote the note before asking',

  'hint.pan': 'Drag to pan',
  'hint.zoom': 'Ctrl/⌘ + wheel to zoom',
  'hint.select': 'Select text to quote it into the input',
  'hint.reader': 'Double-click a card to read',
  'hint.cards': '{count} cards',

  'note.placeholder': 'Write a note…',
  'note.hint': 'Notes can be linked to a parent and quoted into the input.',

  'pending.hint': 'The agent is waiting for your response.',
  'pending.openChat': 'Open Chat',

  'toast.copied': 'Copied',
  'toast.copyFailed': 'Could not copy.',
  'toast.quoted': 'Quote added to the input box',
  'toast.quoteFailed': 'Could not insert the quote; it was copied instead.',
  'toast.importing': 'Importing the conversation…',
  'toast.imported': 'Imported {count} turns',
  'toast.importEmpty': 'No new messages to import.',
  'toast.importFailed': 'Import failed: {message}',
  'toast.deleted': 'Card deleted',
  'toast.cleared': 'Canvas cleared',
  'toast.storage': 'Canvas storage is full. Delete some cards or clear the canvas.',

  'common.close': 'Close',
  'error.noSession': 'This canvas is not attached to a session.',
}

const ZH = {
  'app.title': 'DeepSeek 画布',
  'app.subtitle': '把对话变成相互连接的卡片树',
  'boot.loading': '正在打开画布…',

  'toolbar.import': '导入对话',
  'toolbar.importRecent': '最近 20 轮',
  'toolbar.importAll': '全部历史',
  'toolbar.importing': '正在导入…',
  'toolbar.note': '新建笔记',
  'toolbar.collapseAll': '全部折叠',
  'toolbar.snap': '网格磁吸',
  'toolbar.fit': '适应视图',
  'toolbar.help': '帮助',
  'controls.collapse': '收起控制栏',
  'controls.expand': '展开控制栏',
  'toolbar.helpTitle': '画布模式',
  'toolbar.helpBody': '直接使用下方原来的输入框。先选中一张卡片，回答会作为它的子卡片；没有选中卡片时，在画布任意位置（包括卡片上）拖拽或滚动滚轮都会平移画布。在选中的卡片中选中文字会自动引用到输入框。Ctrl/⌘ + 滚轮缩放。卡片默认全部折叠；折叠的卡片不渲染流式回答，画面更流畅。开启网格磁吸后，新建和拖动后的卡片会吸附到预设网格。',
  'toolbar.zoomIn': '放大',
  'toolbar.zoomOut': '缩小',
  'toolbar.zoomReset': '恢复 100%',
  'zoom.fit': '适应',

  'empty.title': '从一个问题开始',
  'empty.desc': '画布模式把普通对话变成相互连接的卡片。直接在下方输入框提问会创建根卡片；选中已有卡片再提问，回答会成为它的子卡片。历史对话可以按需导入。',
  'empty.importRecent': '导入最近对话',
  'empty.importAll': '导入全部历史',
  'empty.note': '新建笔记',

  'card.answer': '回答',
  'card.note': '笔记',
  'card.untitled': '未命名',
  'card.parent': '来自：{title}',
  'card.children': '{count} 张关联卡片',
  'card.expand': '展开',
  'card.collapse': '收起',
  'card.copy': '复制内容',
  'card.quote': '引用到输入框',
  'card.newNote': '新建子笔记',
  'card.menu': '卡片操作',
  'card.delete': '删除卡片',
  'card.waiting': '正在等待智能体…',
  'card.streaming': '正在生成…',
  'card.done': '完成',
  'card.error': '错误',
  'card.interrupted': '已中断',
  'card.empty': '智能体返回了空回答。',
  'card.reasoning': '思考过程',
  'card.usingTool': '正在使用 {name}…',
  'card.read': '全屏阅读',
  'reader.you': '你',
  'reader.assistant': '智能体',

  'mode.current': '当前问答点：{title}',
  'mode.none': '未选择问答点 · 下一条消息创建根卡片',
  'mode.hint': '使用下方输入框',
  'mode.noteHint': ' · 提问前先引用笔记内容',

  'hint.pan': '拖拽平移',
  'hint.zoom': 'Ctrl/⌘ + 滚轮缩放',
  'hint.select': '选中文字自动引用到输入框',
  'hint.reader': '双击卡片阅读',
  'hint.cards': '{count} 张卡片',

  'note.placeholder': '写一条笔记…',
  'note.hint': '笔记可以连接父卡片，也可以引用到输入框。',

  'pending.hint': '智能体正在等待你的回应。',
  'pending.openChat': '打开对话',

  'toast.copied': '已复制',
  'toast.copyFailed': '复制失败。',
  'toast.quoted': '已引用到输入框',
  'toast.quoteFailed': '无法自动插入，已尝试复制到剪贴板。',
  'toast.importing': '正在导入当前对话…',
  'toast.imported': '已导入 {count} 轮对话',
  'toast.importEmpty': '没有可导入的新消息。',
  'toast.importFailed': '导入失败：{message}',
  'toast.deleted': '卡片已删除',
  'toast.cleared': '画布已清空',
  'toast.storage': '画布存储空间已满。请删除部分卡片或清空画布。',

  'common.close': '关闭',
  'error.noSession': '当前画布没有关联会话。',
}

let registered = false

export function registerUiLocale(ctx) {
  if (registered) return
  registered = true
  try {
    ctx.locale.register(UI_NS, { en: EN, zh: ZH })
  } catch (error) {
    console.error('[deepseek-canvas] UI locale registration failed', error)
  }
}

export function useT(ctx) {
  useSyncExternalStore(
    (listener) => ctx.locale.subscribe(listener),
    () => ctx.locale.getSnapshot(),
  )
  let translate
  try {
    translate = ctx.locale.bind(UI_NS)
  } catch {
    translate = (key) => key
  }
  return (key, params) => {
    let text = translate(key)
    if (typeof text !== 'string' || text === key) text = EN[key] ?? key
    if (params !== undefined) {
      for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(String(value))
      }
    }
    return text
  }
}

export const FALLBACK_LOCALE = { en: EN, zh: ZH }
