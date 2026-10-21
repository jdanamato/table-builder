import { tableCss } from './css'
import { docHead, esc } from './markup'
import type { Settings } from './mods'

/* ── Page chrome for the standalone output file ── */
const PAGE_CSS = [
  '*{box-sizing:border-box}',
  'body{font-family:system-ui,-apple-system,sans-serif;margin:1.5cm;color:#18181b}',
  'header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #e4e4e7;margin-bottom:1.5rem}',
  '.brand{font-size:15px;font-weight:600;letter-spacing:-.02em}',
  '.brand img{display:inline-block;max-height:36px;max-width:200px;width:auto;height:auto;vertical-align:middle}',
  '.meta{font-size:11px;color:#71717a}',
  '.doc-head{margin-bottom:1rem}',
  '.doc-title{margin:0;font-size:18px;font-weight:600;letter-spacing:-.01em}',
  '.doc-desc{margin:6px 0 0;max-width:65ch;font-size:12px;line-height:1.5;color:#52525b}',
  'footer{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-top:10px;border-top:1px solid #e4e4e7;margin-top:1.5rem}',
  'footer .brand{font-size:12px}',
  'footer .brand img{max-height:28px;max-width:160px}',
  '@media print{body{margin:1cm}}',
].join('\n')

/* Header and footer are the same row — a brand or logo at the start, a line of
   contact or note text at the end — so both are written by this. */
function chromeRow(tag: 'header' | 'footer', logo: string | null, text: string, meta: string) {
  const brandHtml = logo ? `<img src="${logo}" alt="Logo" />` : esc(text)
  return (
    `<${tag}><span class="brand">${brandHtml}</span>` +
    `<span class="meta">${esc(meta)}</span></${tag}>`
  )
}

function printHeader(s: Settings): string {
  return chromeRow('header', s.logo, s.brand || 'AutoDrill', s.meta || '')
}

/* Synced, the footer reads the header's own fields rather than a copy of them,
   so editing the header keeps the two in step. */
function printFooter(s: Settings): string {
  if (!s.footer) return ''
  if (s.footerSync) {
    return chromeRow('footer', s.logo, s.brand || 'AutoDrill', s.meta || '')
  }
  return chromeRow('footer', s.footerLogo, s.footerBrand || '', s.footerMeta || '')
}

export function buildDoc(body: string, s: Settings, captionOut: boolean): string {
  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>AutoDrill Chart</title><style>\n' +
    PAGE_CSS +
    '\n' +
    tableCss(s, captionOut) +
    '\n</style></head><body>' +
    printHeader(s) +
    docHead(s) +
    body +
    printFooter(s) +
    '</body></html>'
  )
}

/* ── Open the print dialog ── */
export function openPrint(exportHtml: string, s: Settings, captionOut: boolean): void {
  if (!exportHtml) return
  const doc = buildDoc(exportHtml, s, captionOut)
  const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }))
  const w = window.open(url, '_blank')
  if (w) {
    w.onload = () => {
      w.focus()
      w.print()
    }
  }
}
