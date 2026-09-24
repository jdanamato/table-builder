import { TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { InfoTip } from './InfoTip'
import type { CleanReport } from '@/lib/clean'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { CssFormat } from '@/lib/css'
import { cn } from 'cn'

const PLACEHOLDER = `<div>
  <table>
    <thead>
      <tr><th>Col A</th><th>Col B</th></tr>
    </thead>
    <tbody>
      <tr><td>Value</td><td>Value</td></tr>
    </tbody>
  </table>
</div>`

function SourceLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-foreground">{children}</p>
}

/* ── What the clean did ──
   Clean now takes nodes out, not just attributes, so it can remove half of a
   pasted table. Saying so is the difference between a tool that repaired the
   markup and one that ate it — and the notices are the part no pass could
   decide, handed back rather than guessed at. */
function CleanReportBlock({ report, onUndo }: { report: CleanReport; onUndo: () => void }) {
  const { changes, notices } = report
  const summary = changes.length
    ? changes.map((c) => `${c.count} ${c.label}`).join(' · ')
    : 'Nothing to clean — the markup was already bare.'

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs leading-relaxed text-muted-foreground">{summary}</p>
        {!!changes.length && (
          <Button variant="outline" size="xs" onClick={onUndo}>
            Undo
          </Button>
        )}
      </div>
      {notices.map((n) => (
        <p key={n} className="flex gap-1.5 text-xs leading-relaxed text-foreground">
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0 text-amber-600" />
          <span>{n}</span>
        </p>
      ))}
    </div>
  )
}

export function CodePanel({
  html,
  onHtmlChange,
  onPaste,
  onFormat,
  onClean,
  report,
  onUndoClean,
  cssFormat,
  onCssFormatChange,
  cssOut,
}: {
  html: string
  onHtmlChange: (v: string) => void
  onPaste: () => void
  onFormat: () => void
  onClean: () => void
  report: CleanReport | null
  onUndoClean: () => void
  cssFormat: CssFormat
  onCssFormatChange: (v: CssFormat) => void
  cssOut: string
}) {
  const [copyLabel, setCopyLabel] = useState('Copy')
  const preRef = useRef<HTMLPreElement>(null)
  const inline = cssFormat === 'inline'

  async function copy() {
    try {
      await navigator.clipboard.writeText(cssOut)
      setCopyLabel('Copied')
    } catch {
      // No clipboard access (an insecure origin, usually) — select it instead
      const pre = preRef.current
      if (pre) {
        const r = document.createRange()
        r.selectNodeContents(pre)
        const s = getSelection()
        s?.removeAllRanges()
        s?.addRange(r)
      }
      setCopyLabel('Press ⌘C')
    }
    setTimeout(() => setCopyLabel('Copy'), 1600)
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <SourceLabel>Table HTML</SourceLabel>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="xs" onClick={onFormat}>
              Format
            </Button>
            <Button variant="outline" size="xs" onClick={onClean}>
              Clean
            </Button>
            <InfoTip>
              Format re-indents the markup so the table structure is readable, leaving every
              attribute in place. Clean strips presentational attributes, keeping only what
              carries structure or meaning: colspan, rowspan, headers, scope, abbr, span, href,
              src, alt, title, lang, dir. It then repairs the markup itself — unwrapping the
              page scaffolding a cell's text was buried in, dropping spacer rows and dead
              component mounts, and correcting spans that reach past the end of their section.
              Anything it cannot decide is reported rather than guessed at, and Undo puts the
              original back.
            </InfoTip>
          </div>
        </div>
        <Textarea
          value={html}
          onChange={(e) => onHtmlChange(e.target.value)}
          onPaste={onPaste}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          className="max-h-72 min-h-44 resize-y font-mono text-xs leading-relaxed"
        />
        {report && <CleanReportBlock report={report} onUndo={onUndoClean} />}
      </div>

      <Separator />

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <SourceLabel>{inline ? 'Table HTML, styles inline' : 'Table CSS'}</SourceLabel>
          <div className="flex items-center gap-1.5">
            {/* Tabs rather than a toggle group: the two are exclusive and one
                is always on, which is a tab's contract, not a toggle's. The
                panels live below in the <pre>, so only the list is rendered. */}
            <Tabs
              value={cssFormat}
              onValueChange={(next) => onCssFormatChange(next as CssFormat)}
            >
              <TabsList className="h-7">
                <TabsTrigger value="separate" className="text-xs">
                  Style tag
                </TabsTrigger>
                <TabsTrigger value="inline" className="text-xs">
                  Inline
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <InfoTip>
              Style tag: the rules wrapped in a <code>&lt;style&gt;</code> block, to paste under the
              table code. Inline: the same rules written onto the elements themselves as style
              attributes, for anywhere a <code>&lt;style&gt;</code> tag is stripped — an email, a CMS
              field. Inline output carries the whole table, so it replaces the markup above rather
              than joining it.
            </InfoTip>
            <Button variant="outline" size="xs" onClick={copy}>
              {copyLabel}
            </Button>
          </div>
        </div>
        <pre
          ref={preRef}
          tabIndex={0}
          className={cn(
            'max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11.5px] leading-relaxed text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            inline ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'whitespace-pre',
          )}
        >
          {cssOut}
        </pre>
      </div>
    </section>
  )
}
