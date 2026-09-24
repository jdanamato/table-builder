import { ALL_MODIFIERS, EMITTED, type Settings, classPrefix, getClasses } from './mods'

/* ── Table CSS ──
   `{{name}}` stands for a class this builder owns, and picks up the prefix.
   Only the rules the current settings actually need are emitted.

   These are deliberately not the preview's rules: the preview styles against
   the Radix scales on this page, while what goes out has to stand alone
   anywhere it is pasted, so it carries literal colours. */
const CSS_BASE = [
  'div:has(> table){--tr:10px;overflow:hidden;max-width:100%;border:1px solid #e4e4e7;border-radius:var(--tr);background:#fafafa}',
  'table{width:100%;max-width:100%;table-layout:auto;border-collapse:separate;border-spacing:0;font-size:12px;font-variant-numeric:tabular-nums}',
  'th,td{padding:8px 12px;vertical-align:middle;text-align:start;overflow-wrap:break-word}',
  'thead :is(th,td){font-weight:600;background:#fafafa;border-bottom:1px solid #e4e4e7;font-size:11px;color:#52525b}',
  'tfoot :is(th,td){font-weight:600;border-top:1px solid #e4e4e7}',
  'tbody tr:hover > *{background:rgba(0,0,0,.04)}',
  'tr:has(> th[colspan]) > th{background:#fafafa;font-weight:700;color:#52525b;border-bottom:1px solid #e4e4e7}',
]

const CSS_CAPTION = [
  'caption{padding:10px 12px;text-align:start;font-size:15px;font-weight:600;color:#18181b}',
]

const CSS_SR_ONLY = [
  '.{{sr-only}}{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0}',
]

const CSS_MODS: Record<string, string[]> = {
  'zebra-odd': ['.{{zebra-odd}} tbody tr:nth-child(odd) > *{background:rgba(0,0,0,.025)}'],
  'zebra-even': ['.{{zebra-even}} tbody tr:nth-child(even) > *{background:rgba(0,0,0,.025)}'],
  /* Overlaid as an image so a column stripe composites over the row stripe —
     and over the header's own background — instead of replacing it. */
  'zebra-cols-odd': [
    '.{{zebra-cols-odd}} :is(thead,tbody,tfoot) :is(th,td):nth-child(odd):not([colspan]){background-image:linear-gradient(rgba(0,0,0,.025),rgba(0,0,0,.025))}',
  ],
  'zebra-cols-even': [
    '.{{zebra-cols-even}} :is(thead,tbody,tfoot) :is(th,td):nth-child(even):not([colspan]){background-image:linear-gradient(rgba(0,0,0,.025),rgba(0,0,0,.025))}',
  ],
  'row-lines': ['.{{row-lines}} tbody tr:not(:last-child) > *{border-bottom:1px solid #e4e4e7}'],
  'col-lines': ['.{{col-lines}} tr > *:not(:last-child){border-right:1px solid #e4e4e7}'],
  /* The header cells align with the figures under them, so a column reads
     straight down; the first column labels the row and keeps its own side. */
  numeric: [
    '.{{numeric}} :is(thead,tbody,tfoot) :is(th,td){text-align:right}',
    '.{{numeric}} :is(thead,tbody,tfoot) :is(th,td):first-child{text-align:left}',
  ],
  bare: ['div:has(> table.{{bare}}){background:transparent;border:none}'],
  'size-1': ['.{{size-1}} :is(thead,tbody,tfoot) :is(th,td){padding:5px 8px}'],
  'size-3': ['.{{size-3}} :is(thead,tbody,tfoot) :is(th,td){padding:12px 16px}'],
  'radius-0': ['div:has(> table.{{radius-0}}){--tr:0}'],
  'radius-1': ['div:has(> table.{{radius-1}}){--tr:6px}'],
  'radius-3': ['div:has(> table.{{radius-3}}){--tr:16px}'],
}

/* A caption pushes the header off the top edge, so only an uncaptioned table
   has corners to round. */
const TOP = 'table:not(:has(> caption)) > thead > tr:first-child > :is(th,td)'
const TOP_BARE =
  'table:not(:has(> caption)):not(:has(> thead)) > tbody:first-of-type > tr:first-child > :is(th,td)'
const BOT = 'table:has(> tfoot) > tfoot > tr:last-child > :is(th,td)'
const BOT_BARE = 'table:not(:has(> tfoot)) > tbody:last-of-type > tr:last-child > :is(th,td)'

const CSS_PRINT = [
  'thead{display:table-header-group}',
  'tr{break-inside:avoid}',
  /* An overflow container can be cut at a page break in some print engines, so
     the clipping comes off on paper — which leaves nothing to round the table.
     The corner cells take the radius themselves instead, inheriting --tr. */
  '@media print{\n' +
    '  div:has(> table){overflow:visible}\n' +
    `  ${TOP}:first-child,\n  ${TOP_BARE}:first-child{border-start-start-radius:var(--tr)}\n` +
    `  ${TOP}:last-child,\n  ${TOP_BARE}:last-child{border-start-end-radius:var(--tr)}\n` +
    `  ${BOT}:first-child,\n  ${BOT_BARE}:first-child{border-end-start-radius:var(--tr)}\n` +
    `  ${BOT}:last-child,\n  ${BOT_BARE}:last-child{border-end-end-radius:var(--tr)}\n` +
    '}',
]

/* The rules are written compactly above; this is what makes them readable in
   the panel and in the exported file. At-rules are already laid out by hand. */
function expandRule(r: string): string {
  const open = r.indexOf('{')
  if (r.startsWith('@') || open < 0) return r

  const sel = r.slice(0, open).trim()
  const body = r.slice(open + 1, r.lastIndexOf('}'))
  const decls = body
    .split(';')
    .filter((d) => d.trim())
    // first colon only: the property separator
    .map((d) => `  ${d.trim().replace(/:\s*/, ': ')};`)
    .join('\n')

  return `${sel} {\n${decls}\n}`
}

/* The rules the current settings need, in cascade order and already carrying
   the prefix — what both the stylesheet and the inline pass are built from. */
export function activeRules(s: Settings, captionOut: boolean): string[] {
  const rules = [...CSS_BASE]
  if (captionOut) {
    rules.push(...CSS_CAPTION)
    if (s.captionHidden) rules.push(...CSS_SR_ONLY)
  }
  for (const c of getClasses(s)) {
    if (CSS_MODS[c]) rules.push(...CSS_MODS[c])
  }
  rules.push(...CSS_PRINT)

  const p = classPrefix(s)
  return rules.map((r) => r.replace(/\{\{([\w-]+)\}\}/g, (_, n) => p + n))
}

export function tableCss(s: Settings, captionOut: boolean): string {
  return activeRules(s, captionOut).map(expandRule).join('\n\n')
}

/* ── Inline styles ──
   The same rules written onto the elements themselves, for anywhere a <style>
   tag is stripped. Each rule is matched against the export markup and its
   declarations appended in cascade order, so a later rule wins the way it would
   in a stylesheet. What cannot survive the move is left behind: the print
   block, because a style attribute carries no at-rule, and :hover, because a
   style attribute carries no state. */
export function inlineStyled(exportHtml: string, s: Settings, captionOut: boolean): string {
  if (!exportHtml) return ''

  const root = document.createElement('div')
  root.innerHTML = exportHtml

  for (const r of activeRules(s, captionOut)) {
    const open = r.indexOf('{')
    if (open < 0 || r.startsWith('@')) continue

    const sel = r.slice(0, open).trim()
    if (sel.includes(':hover')) continue

    const decls = r.slice(open + 1, r.lastIndexOf('}'))
    let els: NodeListOf<HTMLElement>
    try {
      els = root.querySelectorAll<HTMLElement>(sel)
    } catch {
      continue
    }
    els.forEach((el) => {
      const had = el.style.cssText.trim()
      el.style.cssText = (had ? had.replace(/;?$/, ';') : '') + decls
    })
  }

  // The classes have done their work; inline markup carries no stylesheet.
  const p = classPrefix(s)
  const owned = new Set([...ALL_MODIFIERS, ...EMITTED].map((n) => p + n))
  root.querySelectorAll('[class]').forEach((el) => {
    for (const c of [...el.classList]) if (owned.has(c)) el.classList.remove(c)
    if (!el.className) el.removeAttribute('class')
  })

  return root.innerHTML
}

export type CssFormat = 'separate' | 'inline'

export function cssText(
  format: CssFormat,
  exportHtml: string,
  s: Settings,
  captionOut: boolean,
): string {
  if (format === 'inline') return inlineStyled(exportHtml, s, captionOut)
  return `<style>\n${tableCss(s, captionOut)}\n</style>`
}
