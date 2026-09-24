import {
  type Settings,
  classPrefix,
  clearOwned,
  getClasses,
  withPrefix,
} from './mods'

export function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ── Caption ──
   The caption belongs to the table: it lives in the markup and travels with it,
   unlike the title and description, which are printed beside the table and
   never written into it. Text typed here overwrites a caption already in the
   pasted markup; an empty field leaves that one as it stands. */
export function captionText(s: Settings): string {
  return (s.captionSync ? s.title : s.caption).trim()
}

function applyCaption(table: Element, s: Settings): boolean {
  let cap = table.querySelector(':scope > caption')
  const t = captionText(s)

  if (t) {
    if (!cap) {
      cap = document.createElement('caption')
      table.insertBefore(cap, table.firstChild)
    }
    cap.textContent = t
  }

  if (!cap) return false

  cap.classList.toggle('sr-only', s.captionHidden)
  if (!cap.className) cap.removeAttribute('class')
  return true
}

/* The widest row, counting a spanning cell for every column it covers — a table
   that opens on a full-width band would otherwise report one column. */
function columnCount(table: Element): number {
  let max = 0
  table.querySelectorAll('tr').forEach((tr) => {
    let n = 0
    for (const c of [...tr.children]) {
      n += Math.max(1, parseInt(c.getAttribute('colspan') ?? '', 10) || 1)
    }
    if (n > max) max = n
  })
  return max
}

export type Build = {
  /* What the preview pane shows: the title block above the table, bare class
     names, no prefix. */
  previewHtml: string
  /* Output-ready markup for the current settings: the same string the editor is
     synced with, the CSS is generated against, and the export document embeds. */
  exportHtml: string
  status: string
  /* Whether the table that was just built carries a caption — from this panel
     or from the pasted markup. The caption rules follow that, not the field, so
     a pasted caption is styled too. */
  captionOut: boolean
}

/* ── Build ──
   `prefixes` is every prefix the markup may be carrying: the one now typed and
   the one it was last written with. Clearing a class has to go by the name that
   is actually in the markup, not the one now set. */
export function build(html: string, s: Settings, prefixes: string[]): Build {
  const v = html.trim()
  if (!v) {
    return { previewHtml: '', exportHtml: '', status: '', captionOut: false }
  }

  const tmp = document.createElement('div')
  tmp.innerHTML = v

  // Auto-wrap a bare <table> in a <div> if needed
  const firstEl = tmp.firstElementChild
  if (firstEl && firstEl.tagName === 'TABLE') {
    const wrap = document.createElement('div')
    firstEl.replaceWith(wrap)
    wrap.appendChild(firstEl)
  }

  const table = tmp.querySelector('table')
  let status = ''
  let captionOut = false

  if (table) {
    clearOwned(table, prefixes)
    for (const c of getClasses(s)) table.classList.add(c)
    if (!table.className) table.removeAttribute('class')

    captionOut = applyCaption(table, s)

    const rows = table.querySelectorAll('tbody tr').length
    status = `${rows} rows · ${columnCount(table)} cols`
  }

  /* The title and description are shown the way they will print — above the
     table, outside the markup — so the preview stays a preview of the page, not
     of the copy. `tmp` is what the export is built from, and they are
     deliberately not in it. */
  return {
    previewHtml: docHead(s) + tmp.innerHTML,
    exportHtml: withPrefix(tmp, classPrefix(s)).innerHTML,
    status,
    captionOut,
  }
}

/* ── Title and description ──
   They describe the document, so they are printed above the table rather than
   folded into it. The same block is what the preview shows. */
export function docHead(s: Settings): string {
  const t = s.title.trim()
  const d = s.desc.trim()
  if (!t && !d) return ''

  return (
    '<div class="doc-head">' +
    (t ? `<h1 class="doc-title">${esc(t)}</h1>` : '') +
    (d ? `<p class="doc-desc">${esc(d).replace(/\n/g, '<br>')}</p>` : '') +
    '</div>'
  )
}

/* ── Clean ──
   Removes style, class and every other presentational leftover from pasted
   markup. Only attributes that carry table structure or meaning survive —
   anything else would fight the modifier classes applied here. */
const KEEP_ATTRS = new Set([
  'colspan', 'rowspan', 'headers', 'scope', 'abbr', 'span',
  'href', 'src', 'alt', 'title', 'lang', 'dir',
])

export function cleanMarkup(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      if (!KEEP_ATTRS.has(a.name.toLowerCase())) el.removeAttribute(a.name)
    }
  })
  return tmp.innerHTML
}

/* ── Format ──
   Re-indents the markup so the table structure reads at a glance. Nothing is
   added or taken away: every attribute survives, and only the whitespace
   between tags is rewritten. Elements whose children are all text or inline
   markup stay on one line, so a cell is never split across four of them. */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn',
  'em', 'i', 'img', 'ins', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
])

const INDENT = '  '

/* The tag as written, attributes and all — rebuilt rather than sliced out of
   outerHTML, which a `>` inside an attribute value would cut in the wrong
   place. */
function openTag(el: Element): string {
  const attrs = [...el.attributes]
    .map((a) => ` ${a.name}="${a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)
    .join('')
  return `<${el.tagName.toLowerCase()}${attrs}>`
}

/* Whitespace-only text between tags is layout, not content, so it is dropped
   and written back as indentation. Text with something in it is kept. */
function meaningful(n: Node): boolean {
  return (
    n.nodeType === 1 ||
    n.nodeType === 8 ||
    (n.nodeType === 3 && !!n.textContent?.trim())
  )
}

function writeNode(node: Node, depth: number, out: string[]): void {
  const pad = INDENT.repeat(depth)

  if (node.nodeType === 3) {
    out.push(pad + (node.textContent ?? '').trim().replace(/\s+/g, ' '))
    return
  }
  if (node.nodeType === 8) {
    out.push(`${pad}<!--${node.textContent}-->`)
    return
  }
  if (node.nodeType !== 1) return

  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (VOID_TAGS.has(tag)) {
    out.push(pad + openTag(el))
    return
  }

  const kids = [...el.childNodes].filter(meaningful)
  const close = `</${tag}>`

  if (!kids.length) {
    out.push(pad + openTag(el) + close)
    return
  }

  /* Inline-only content keeps its own spacing, collapsed to single spaces —
     breaking it onto separate lines would introduce gaps the browser renders. */
  const inlineOnly = kids.every(
    (n) =>
      n.nodeType === 3 ||
      (n.nodeType === 1 && INLINE_TAGS.has((n as Element).tagName.toLowerCase())),
  )
  if (inlineOnly) {
    out.push(pad + openTag(el) + el.innerHTML.replace(/\s+/g, ' ').trim() + close)
    return
  }

  out.push(pad + openTag(el))
  for (const k of kids) writeNode(k, depth + 1, out)
  out.push(pad + close)
}

export function prettyHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html

  const out: string[] = []
  for (const n of [...tmp.childNodes].filter(meaningful)) writeNode(n, 0, out)
  return out.join('\n')
}
