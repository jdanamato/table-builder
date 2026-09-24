/* ── Clean ──
   Scraped tables arrive wrapped in the markup of the page they came from: a
   cell's text four divs deep, rows that exist only to hold a spacer, cells with
   a rowspan of 3000 reserving a column that was never drawn. None of it is
   styling, so none of it can be styled away — a cell with a rowspan occupies a
   grid slot, and no selector can un-occupy one. It has to come out of the
   markup before the rules are written against it.

   The passes below are deliberately not a list of fixes for particular sites.
   Each node gets classified by what it contributes to the rendered grid, which
   has only three answers: it carries text, it holds a grid slot, or it is
   scaffolding. Scaffolding is unwrapped or dropped. That generalises to markup
   this was never tested against, where a catalogue of per-site rules would not.

   What cannot be decided this way is reported instead of guessed at. */

export type CleanReport = {
  /* What the passes changed, for the line under the editor. */
  changes: { label: string; count: number }[]
  /* What no pass can settle, so the person can judge it. */
  notices: string[]
}

export type CleanResult = { html: string; report: CleanReport }

/* Attributes that carry table structure or meaning. Everything else is
   presentational and would fight the modifier classes applied here. */
const KEEP_ATTRS = new Set([
  'colspan', 'rowspan', 'headers', 'scope', 'abbr', 'span',
  'href', 'src', 'alt', 'title', 'lang', 'dir',
])

/* The elements that build the grid. They hold slots, so they are never
   unwrapped and never dropped for being empty — an empty cell is still a cell,
   and removing it would shift every cell after it into the wrong column. */
const GRID_TAGS = new Set([
  'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
])

/* Elements that draw something of their own, with no text to find them by. */
const REPLACED = new Set([
  'img', 'svg', 'picture', 'canvas', 'video', 'audio', 'iframe', 'object', 'embed', 'br', 'hr',
])

/* Elements that did something on the page they came from. A static copy cannot
   reproduce the behaviour, so these are kept and reported rather than removed:
   an <img> in a parts table is usually the part. */
const INTERACTIVE = new Set([
  'button', 'input', 'select', 'textarea', 'form', 'label', 'details', 'summary',
])

const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i',
  'ins', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup',
  'time', 'u', 'var',
])

const tag = (el: Element) => el.tagName.toLowerCase()

/* A node earns its place if it puts text or a drawn element on the page. */
function drawsSomething(el: Element): boolean {
  if (el.textContent?.trim()) return true
  return !!el.querySelector([...REPLACED, ...INTERACTIVE].join(','))
}

function span(cell: Element, name: string): number {
  return Math.max(1, parseInt(cell.getAttribute(name) ?? '', 10) || 1)
}

const rowsOf = (section: Element) => [...section.children].filter((el) => tag(el) === 'tr')

function sectionsOf(table: Element): Element[] {
  const groups = [...table.children].filter((el) =>
    ['thead', 'tbody', 'tfoot'].includes(tag(el)),
  )
  return groups.length ? groups : [table]
}

/* ── Pass 1: attributes ── */
function stripAttrs(root: Element): void {
  root.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      if (!KEEP_ATTRS.has(a.name.toLowerCase())) el.removeAttribute(a.name)
    }
  })
}

/* ── Pass 2: wrappers ──
   An element with no attributes left and no grid role is scaffolding. Inline
   scaffolding always goes: `<span><span>1/8</span></span>` renders as its text
   either way. A block wrapper only goes when it is its parent's only child,
   which is the nesting case; one of several blocks in a cell is separating
   lines of content, and unwrapping it would run them together. */
function unwrapWrappers(root: Element): number {
  let unwrapped = 0
  for (let pass = 0; pass < 8; pass++) {
    const targets = [...root.querySelectorAll('*')].filter((el) => {
      const t = tag(el)
      if (el.attributes.length || GRID_TAGS.has(t)) return false
      if (REPLACED.has(t) || INTERACTIVE.has(t)) return false
      if (INLINE_TAGS.has(t)) return true
      return el.parentElement?.children.length === 1
    })
    if (!targets.length) break
    for (const el of targets) {
      el.replaceWith(...el.childNodes)
      unwrapped++
    }
  }
  return unwrapped
}

/* ── Pass 3: dead nodes ──
   The mount point a component was rendered into is left behind as an empty
   element — `<div title="About Oversized"></div>` was a tooltip. It draws
   nothing now. Deepest first, so a nest collapses in one go. */
function dropEmpty(root: Element): number {
  let dropped = 0
  const all = [...root.querySelectorAll('*')].reverse()
  for (const el of all) {
    const t = tag(el)
    if (GRID_TAGS.has(t) || REPLACED.has(t) || INTERACTIVE.has(t)) continue
    if (drawsSomething(el)) continue
    el.remove()
    dropped++
  }
  return dropped
}

/* ── Pass 4: rows ──
   A <tr> with no cells draws nothing, but it still counts: every stripe rule
   below it is a row out of phase. A row whose cells are all empty is the same
   thing written differently — it is also where the reserved-column cells live,
   the ones whose rowspan pushes every later row two columns to the right. */
function dropDeadRows(table: Element): { spacers: number; blanks: number } {
  let spacers = 0
  let blanks = 0
  for (const tr of [...table.querySelectorAll('tr')]) {
    const cells = [...tr.children].filter((c) => ['td', 'th'].includes(tag(c)))
    if (!cells.length) {
      tr.remove()
      spacers++
    } else if (!cells.some(drawsSomething)) {
      tr.remove()
      blanks++
    }
  }
  return { spacers, blanks }
}

/* ── Pass 5: spans ──
   A rowspan reaching past the end of its section is a claim on rows that do not
   exist. Browsers clamp it when laying the table out, but the number goes on
   confusing anything that reads the markup, this app included. */
function clampSpans(table: Element, cols: number): number {
  let clamped = 0
  for (const section of sectionsOf(table)) {
    const rows = rowsOf(section)
    rows.forEach((tr, i) => {
      const left = rows.length - i
      for (const cell of [...tr.children]) {
        const rs = span(cell, 'rowspan')
        if (rs > left) {
          if (left > 1) cell.setAttribute('rowspan', String(left))
          else cell.removeAttribute('rowspan')
          clamped++
        }
        const cs = span(cell, 'colspan')
        if (cols && cs > cols) {
          cell.setAttribute('colspan', String(cols))
          clamped++
        }
      }
    })
  }
  return clamped
}

/* ── The grid ──
   How wide each row actually is, spans and all — a cell carried down by a
   rowspan occupies its column in every row it covers, so counting a row's own
   cells would report it short. */
function rowWidths(table: Element): number[] {
  const carried: number[] = []
  const widths: number[] = []

  for (const tr of [...table.querySelectorAll('tr')]) {
    const taken: boolean[] = []
    let width = 0
    for (let c = 0; c < carried.length; c++) {
      if (carried[c] > 0) {
        taken[c] = true
        width = Math.max(width, c + 1)
      }
    }

    let col = 0
    for (const cell of [...tr.children]) {
      if (!['td', 'th'].includes(tag(cell))) continue
      while (taken[col]) col++
      const cs = span(cell, 'colspan')
      const rs = span(cell, 'rowspan')
      for (let k = 0; k < cs; k++) {
        taken[col + k] = true
        if (rs > 1) carried[col + k] = rs
      }
      col += cs
      width = Math.max(width, col)
    }

    widths.push(width)
    for (let c = 0; c < carried.length; c++) if (carried[c] > 0) carried[c]--
  }
  return widths
}

/* ── What no pass can decide ──
   Each of these is a guess if the app makes it and a judgement if the person
   does, so they are handed back rather than acted on. */
function collectNotices(table: Element): string[] {
  const notices: string[] = []

  const widths = rowWidths(table).filter(Boolean)
  if (widths.length) {
    const wide = Math.max(...widths)
    const short = widths.filter((w) => w < wide).length
    if (short) {
      notices.push(
        `${short} of ${widths.length} rows are narrower than the widest row ` +
          `(${wide} columns) — the table has gaps this app cannot place for you.`,
      )
    }
  }

  const bodies = table.querySelectorAll(':scope > tbody').length
  if (bodies > 1) {
    notices.push(
      `${bodies} <tbody> sections. Row stripes count from the start of each one, ` +
        `so they restart at every section — CSS cannot count across them.`,
    )
  }

  const kept = new Map<string, number>()
  table.querySelectorAll([...REPLACED, ...INTERACTIVE].join(',')).forEach((el) => {
    const t = tag(el)
    if (t === 'br' || t === 'hr') return
    kept.set(t, (kept.get(t) ?? 0) + 1)
  })
  if (kept.size) {
    const list = [...kept].map(([t, n]) => `${n} × <${t}>`).join(', ')
    notices.push(
      `${list} kept in place. These did something on the page they came from; ` +
        `in a copied table they may render as empty space.`,
    )
  }

  return notices
}

export function cleanMarkup(html: string): CleanResult {
  const root = document.createElement('div')
  root.innerHTML = html

  stripAttrs(root)
  const unwrapped = unwrapWrappers(root)
  const emptied = dropEmpty(root)

  const table = root.querySelector('table')
  let rows = { spacers: 0, blanks: 0 }
  let clamped = 0
  let notices: string[] = []

  if (table) {
    rows = dropDeadRows(table)
    clamped = clampSpans(table, Math.max(0, ...rowWidths(table)))
    notices = collectNotices(table)
  }

  const changes = [
    { label: 'wrappers unwrapped', count: unwrapped },
    { label: 'empty elements removed', count: emptied },
    { label: 'spacer rows removed', count: rows.spacers },
    { label: 'blank rows removed', count: rows.blanks },
    { label: 'oversized spans corrected', count: clamped },
  ].filter((c) => c.count > 0)

  return { html: root.innerHTML, report: { changes, notices } }
}
