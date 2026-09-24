import { useMemo, useRef, useState } from 'react'
import { CodePanel } from '@/components/CodePanel'
import { PreviewPanel } from '@/components/PreviewPanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Tabs } from '@/components/interior/tabs'
import { PrintTab } from '@/components/tabs/PrintTab'
import { StyleTab } from '@/components/tabs/StyleTab'
import { TableTab } from '@/components/tabs/TableTab'
import { type CleanReport, cleanMarkup } from '@/lib/clean'
import { type CssFormat, cssText } from '@/lib/css'
import { build, prettyHtml } from '@/lib/markup'
import { INITIAL_SETTINGS, type Settings, adoptClasses, classPrefix } from '@/lib/mods'
import { openPrint } from '@/lib/print'

const PANEL_TABS = [
  { value: 'table', label: 'Table' },
  { value: 'style', label: 'Style' },
  { value: 'print', label: 'Print' },
]

export default function App() {
  const [html, setHtml] = useState('')
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS)
  const [cssFormat, setCssFormat] = useState<CssFormat>('separate')

  /* What the last clean did, and the markup it did it to. Clean rewrites the
     editor's value, which is what takes a controlled textarea's own undo away,
     so the way back has to be kept here. */
  const [report, setReport] = useState<CleanReport | null>(null)
  const beforeClean = useRef('')

  /* The prefix the editor's markup was last written with. Clearing a class has
     to go by the name that is actually in the markup, not the one now typed. */
  const lastPrefix = useRef('')
  const pasting = useRef(false)

  const prefixes = (s: Settings) => [lastPrefix.current, classPrefix(s)]

  const built = useMemo(
    () => build(html, settings, prefixes(settings)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [html, settings],
  )

  const cssOut = useMemo(
    () => cssText(cssFormat, built.exportHtml, settings, built.captionOut),
    [cssFormat, built.exportHtml, built.captionOut, settings],
  )

  /* ── The two directions ──
     A control change writes the styled markup back into the editor, so what is
     shown is what there is to copy. Typing does not: rewriting the value on
     every keystroke would fight the person typing. Whichever of the two was
     touched last is the one that wins. */
  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    const b = build(html, next, prefixes(next))
    if (b.exportHtml) setHtml(b.exportHtml)
    lastPrefix.current = classPrefix(next)
  }

  /* Settings the table never carries — preview aids and print chrome. They
     change nothing in the markup, so they leave the editor alone. */
  function setView(patch: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...patch }))
  }

  /* Typing and pasting both arrive here: the markup is what the person just
     worked on, so its classes set the panel before anything is written back
     over them. */
  function onHtmlChange(v: string) {
    const adopted = adoptClasses(v, settings, prefixes(settings))
    setSettings(adopted)

    setReport(null)

    if (pasting.current) {
      pasting.current = false
      const b = build(v, adopted, prefixes(adopted))
      setHtml(b.exportHtml || v)
      lastPrefix.current = classPrefix(adopted)
      return
    }
    setHtml(v)
  }

  function onFormat() {
    /* The settings are read off the markup and written back in first, so what
       gets indented is one canonical set of classes — never the hand-edited one
       stacked under the panel's own. */
    const adopted = adoptClasses(html, settings, prefixes(settings))
    setSettings(adopted)
    const b = build(html, adopted, prefixes(adopted))
    setHtml(prettyHtml(b.exportHtml || html))
    lastPrefix.current = classPrefix(adopted)
  }

  function onClean() {
    const { html: cleaned, report } = cleanMarkup(html)
    beforeClean.current = html
    setReport(report)
    const b = build(cleaned, settings, prefixes(settings))
    setHtml(b.exportHtml || cleaned)
    lastPrefix.current = classPrefix(settings)
  }

  function onUndoClean() {
    setHtml(beforeClean.current)
    setReport(null)
  }

  return (
    <div className="mx-auto flex max-w-[1140px] flex-col gap-4 p-6 max-sm:p-4">
      <header className="flex items-baseline justify-between gap-4 border-b pb-3.5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold tracking-tight">Table to PDF</h1>
          <p className="text-[13px] text-muted-foreground max-sm:hidden">
            Quickly convert HTML tables to PDFs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">v1.0</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
        {/* Controls, split across three tabs so the panel stops growing past
            the preview. The tab component draws the card itself. */}
        <Tabs
          items={PANEL_TABS}
          defaultValue="table"
          label="Controls"
          className="max-lg:order-2"
          renderPanel={(tab) => {
            if (tab === 'style')
              return <StyleTab settings={settings} update={update} setView={setView} />
            if (tab === 'print')
              return (
                <PrintTab
                  settings={settings}
                  update={update}
                  setView={setView}
                  canPrint={!!built.exportHtml}
                  onPrint={() => openPrint(built.exportHtml, settings, built.captionOut)}
                />
              )
            return <TableTab settings={settings} update={update} />
          }}
        />

        {/* Preview stacked over the source editor, so pasted markup stays in
            view while the table renders above it. */}
        <div className="flex min-w-0 flex-col gap-4 max-lg:order-1">
          <PreviewPanel
            html={built.previewHtml}
            status={built.status}
            stickyHeader={settings.stickyHeader}
            stickyFirst={settings.stickyFirst}
          />
          <CodePanel
            html={html}
            onHtmlChange={onHtmlChange}
            onPaste={() => {
              pasting.current = true
            }}
            onFormat={onFormat}
            onClean={onClean}
            report={report}
            onUndoClean={onUndoClean}
            cssFormat={cssFormat}
            onCssFormatChange={setCssFormat}
            cssOut={cssOut}
          />
        </div>
      </div>
    </div>
  )
}
