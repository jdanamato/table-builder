import { useEffect, useRef } from 'react'
import { cn } from 'cn'

/* ── Sticky layout ──
   A header of several rows cannot pin them all to the same offset — they would
   land on top of each other, leaving only the last one in sight. Each row is
   measured and pinned below the ones before it, and given a z-index above them
   so the row that stacks first also paints in front.

   The band labels are wrapped here rather than in the markup being exported:
   the preview owns its own copy of the table by this point, so the wrapper is a
   display aid that never reaches the copied HTML or the printed page. */
function layoutSticky(root: HTMLElement) {
  const table = root.querySelector('table')
  if (!table) return

  const head = [...(table.tHead ? table.tHead.rows : [])]
  const depth = head.length
  let offset = 0

  head.forEach((row, i) => {
    row.style.setProperty('--sticky-top', `${offset}px`)
    row.style.setProperty('--sticky-z', String(depth - i + 1))
    /* Read after the offset is set, so a row already pinned still measures at
       its laid-out height rather than at nothing. */
    offset += row.getBoundingClientRect().height
  })

  /* A span of one is no span: scraped markup writes colspan="1" on ordinary
     cells, and wrapping every one of those would be a label around nothing. */
  table.querySelectorAll('tr > :first-child[colspan]:not([colspan="1"])').forEach((cell) => {
    if (cell.firstElementChild?.classList.contains('band-label')) return
    const label = document.createElement('span')
    label.className = 'band-label'
    while (cell.firstChild) label.appendChild(cell.firstChild)
    cell.appendChild(label)
  })
}

export function PreviewPanel({
  html,
  status,
  stickyHeader,
  stickyFirst,
}: {
  html: string
  status: string
  stickyHeader: boolean
  stickyFirst: boolean
}) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) layoutSticky(bodyRef.current)
  }, [html, stickyHeader, stickyFirst])

  /* Row heights move with the width the table is laid out at. */
  useEffect(() => {
    const onResize = () => {
      if (bodyRef.current) layoutSticky(bodyRef.current)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-muted-foreground">Preview</span>
          <span className="text-[11px] whitespace-nowrap text-muted-foreground/80">{status}</span>
        </div>
      </header>

      {html ? (
        <div
          ref={bodyRef}
          className={cn(
            'preview-body',
            stickyHeader && 'is-sticky-header',
            stickyFirst && 'is-sticky-first',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="px-4 py-12 text-center text-[13px] text-muted-foreground">
          Paste table HTML below to preview.
        </p>
      )}
    </section>
  )
}
