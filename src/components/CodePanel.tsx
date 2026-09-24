import { useRef, useState } from 'react'
import { InfoTip } from './InfoTip'
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

export function CodePanel({
  html,
  onHtmlChange,
  onPaste,
  onFormat,
  onClean,
  cssFormat,
  onCssFormatChange,
  cssOut,
}: {
  html: string
  onHtmlChange: (v: string) => void
  onPaste: () => void
  onFormat: () => void
  onClean: () => void
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
              attribute in place. Clean strips style, class, id, data-* and every other
              presentational attribute, keeping only what carries table structure or meaning:
              colspan, rowspan, headers, scope, abbr, span, href, src, alt, title, lang, dir.
            </InfoTip>
          </div>
        </div>
        <Textarea
          value={html}
          onChange={(e) => onHtmlChange(e.target.value)}
          onPaste={onPaste}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          className="min-h-44 resize-y font-mono text-xs leading-relaxed"
        />
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
                <TabsTrigger value="separate">Style tag</TabsTrigger>
                <TabsTrigger value="inline">Inline</TabsTrigger>
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
