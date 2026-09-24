import { useRef, useState } from 'react'
import { InfoTip } from './InfoTip'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
            <ToggleGroup
              size="sm"
              variant="outline"
              value={[cssFormat]}
              onValueChange={(next) => {
                /* Base UI's toggle group is multi-select, so the single choice
                   is enforced here: the newly pressed item wins and pressing
                   the current one again is ignored, never leaving it empty. */
                const picked = next.find((v) => v !== cssFormat)
                if (picked) onCssFormatChange(picked as CssFormat)
              }}
            >
              <ToggleGroupItem value="separate">Style tag</ToggleGroupItem>
              <ToggleGroupItem value="inline">Inline</ToggleGroupItem>
            </ToggleGroup>
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
