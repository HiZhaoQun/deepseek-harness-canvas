/** Safe, dependency-free Markdown rendering used by answer cards. */
import { h, useState } from './runtime.js?v=2'
import { Icon } from './icons.js?v=2'

function isCjk(char) {
  return /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char)
}

function joinSoftLines(lines) {
  let result = ''
  for (const line of lines) {
    const text = line.trim()
    if (text.length === 0) continue
    if (result.length === 0) {
      result = text
      continue
    }
    const last = result[result.length - 1]
    const first = text[0]
    result += isCjk(last) && isCjk(first) ? text : ` ${text}`
  }
  return result
}

export async function copyText(text) {
  try {
    if (navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path.
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

function safeHref(raw) {
  try {
    const url = new URL(raw, window.location.href)
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') return url.href
  } catch {
    // Invalid links render as text.
  }
  return undefined
}

const INLINE_RE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\)|\$[^$\n]+\$)/g

function renderInline(text, keyPrefix = 'i') {
  if (typeof text !== 'string' || text.length === 0) return []
  const parts = text.split(INLINE_RE)
  return parts.map((part, index) => {
    if (part.length === 0) return null
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return h('strong', { key }, renderInline(part.slice(2, -2), `${key}-s`))
    }
    if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
      return h('strong', { key }, renderInline(part.slice(2, -2), `${key}-s`))
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return h('code', { key, className: 'dc-inline-code' }, part.slice(1, -1))
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return h('span', { key, className: 'dc-inline-math' }, part.slice(1, -1))
    }
    if ((part.startsWith('*') && part.endsWith('*') && part.length > 2)
      || (part.startsWith('_') && part.endsWith('_') && part.length > 2)) {
      return h('em', { key }, renderInline(part.slice(1, -1), `${key}-e`))
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link !== null) {
      const href = safeHref(link[2])
      if (href === undefined) return h('span', { key }, link[1])
      return h('a', { key, href, target: '_blank', rel: 'noreferrer noopener' }, link[1])
    }
    return h('span', { key }, part)
  }).filter(Boolean)
}

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)
  return h('div', { className: 'dc-code-block' },
    h('div', { className: 'dc-code-head' },
      h('span', { className: 'dc-code-lang' }, language.length > 0 ? language : 'code'),
      h('button', {
        type: 'button',
        className: 'dc-code-copy',
        onClick: () => {
          copyText(code).then((ok) => {
            if (!ok) return
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
          })
        },
        'aria-label': 'Copy code',
      }, h(Icon, { name: copied ? 'check' : 'copy', size: 13 }), copied ? 'Copied' : 'Copy'),
    ),
    h('pre', { className: 'dc-code' }, h('code', null, code)),
  )
}

function parseTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isTableSeparator(line) {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-')
}

function parseBlocks(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim().length === 0) {
      index += 1
      continue
    }

    const fence = /^\s*(```|~~~)\s*([\w.+-]*)\s*$/.exec(line)
    if (fence !== null) {
      const marker = fence[1]
      const language = fence[2] ?? ''
      const code = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith(marker)) {
        code.push(lines[index])
        index += 1
      }
      index += 1
      blocks.push({ kind: 'code', code: code.join('\n'), language })
      continue
    }

    if (/^\s*\$\$\s*$/.test(line)) {
      const math = []
      index += 1
      while (index < lines.length && !/^\s*\$\$\s*$/.test(lines[index])) {
        math.push(lines[index])
        index += 1
      }
      index += 1
      blocks.push({ kind: 'math', text: math.join('\n') })
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading !== null) {
      const level = Math.min(6, heading[1].length)
      blocks.push({ kind: 'heading', level, text: heading[2] })
      index += 1
      continue
    }

    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ kind: 'hr' })
      index += 1
      continue
    }

    if (/^\s*>/.test(line)) {
      const quote = []
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      blocks.push({ kind: 'quote', text: quote.join('\n') })
      continue
    }

    const unordered = /^\s*[-*+]\s+/.exec(line)
    const ordered = /^\s*\d+[.)]\s+/.exec(line)
    if (unordered !== null || ordered !== null) {
      const list = []
      const isOrdered = ordered !== null
      while (index < lines.length) {
        const match = isOrdered
          ? /^\s*\d+[.)]\s+(.*)$/.exec(lines[index])
          : /^\s*[-*+]\s+(.*)$/.exec(lines[index])
        if (match === null) break
        list.push(match[1])
        index += 1
      }
      blocks.push({ kind: 'list', ordered: isOrdered, items: list })
      continue
    }

    if (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const header = parseTableRow(line)
      index += 2
      const rows = []
      while (index < lines.length && lines[index].includes('|') && lines[index].trim().length > 0) {
        rows.push(parseTableRow(lines[index]))
        index += 1
      }
      blocks.push({ kind: 'table', header, rows })
      continue
    }

    const paragraph = [line]
    index += 1
    while (index < lines.length) {
      const next = lines[index]
      if (next.trim().length === 0) break
      if (/^\s*(```|~~~|\$\$|#{1,6}\s|>|[-*+]\s+|\d+[.)]\s+)/.test(next)) break
      if (next.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) break
      paragraph.push(next)
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: joinSoftLines(paragraph) })
  }
  return blocks
}

function renderBlock(block, index) {
  switch (block.kind) {
    case 'code':
      return h(CodeBlock, { key: index, code: block.code, language: block.language })
    case 'math':
      return h('pre', { key: index, className: 'dc-math-block' }, block.text)
    case 'heading': {
      const tag = `h${Math.min(6, block.level + 1)}`
      return h(tag, { key: index, className: `dc-md-heading dc-md-h${block.level}` }, renderInline(block.text, `h${index}`))
    }
    case 'hr':
      return h('hr', { key: index, className: 'dc-md-hr' })
    case 'quote':
      return h('blockquote', { key: index, className: 'dc-md-quote' }, renderInline(block.text, `q${index}`))
    case 'list':
      return h(block.ordered ? 'ol' : 'ul', { key: index, className: 'dc-md-list' },
        block.items.map((item, itemIndex) => h('li', { key: itemIndex }, renderInline(item, `l${index}-${itemIndex}`))),
      )
    case 'table':
      return h('div', { key: index, className: 'dc-table-wrap' },
        h('table', { className: 'dc-md-table' },
          h('thead', null, h('tr', null, block.header.map((cell, cellIndex) => h('th', { key: cellIndex }, renderInline(cell, `th${index}-${cellIndex}`))))),
          h('tbody', null, block.rows.map((row, rowIndex) => h('tr', { key: rowIndex }, row.map((cell, cellIndex) => h('td', { key: cellIndex }, renderInline(cell, `td${index}-${rowIndex}-${cellIndex}`)))))),
        ),
      )
    default:
      return h('p', { key: index, className: 'dc-md-p' }, renderInline(block.text, `p${index}`))
  }
}

/**
 * Render Markdown text.
 * @param {{text: string, className?: string}} props
 */
export function Markdown({ text, className }) {
  const blocks = parseBlocks(text)
  return h('div', { className: className === undefined ? 'dc-markdown' : `dc-markdown ${className}` },
    blocks.map(renderBlock),
  )
}


