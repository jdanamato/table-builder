import { TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { InfoTip } from './InfoTip'
import {
  CLEAN_OPTIONS,
  type CleanOptions,
  type CleanReport,
  type CleanRule,
  DEFAULT_CLEAN_OPTIONS,
  KEPT_ATTRS,
  LINK_ATTRS,
} from '@/lib/clean'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { CssFormat } from '@/lib/css'
import { cn } from 'cn'

const PLACEHOLDER = 'Paste your table HTML here to start'

function SourceLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-foreground">{children}</p>
}

function CopyIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.25" y="0.75" width="8" height="8" rx="1.5" ry="1.5" />
      <path d="m8.25,11.25H2.25c-.828,0-1.5-.672-1.5-1.5V3.75" />
    </svg>
  )
}

/* ── Copy, floated ──
   The button sits over the bottom right of the thing it copies, so there is no
   guessing which output a header-row button belongs to. It is hidden until the
   block is hovered — and until it is focused, so tabbing still reaches it. */
function CopyButton({ text, onFallback }: { text: string; onFallback: () => void }) {
  const [label, setLabel] = useState('Copy')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setLabel('Copied')
    } catch {
      // No clipboard access (an insecure origin, usually) — select it instead
      onFallback()
      setLabel('Press ⌘C')
    }
    setTimeout(() => setLabel('Copy'), 1600)
  }

  return (
    <Button
      variant="outline"
      size="xs"
      onClick={copy}
      className="absolute right-2 bottom-2 opacity-0 shadow-xs transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <CopyIcon />
      {label}
    </Button>
  )
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

/* ── Clean's options, remembered ──
   Kept in this browser so a person who turned something off does not have to
   find it again. Read over the defaults, so an option added later starts at
   its default rather than off. Storage can be missing or refuse (a private
   window), in which case the defaults simply apply. */
const OPTIONS_KEY = 'table-builder:clean-options'

function loadCleanOptions(): CleanOptions {
  try {
    const saved = JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? '{}')
    return { ...DEFAULT_CLEAN_OPTIONS, ...saved }
  } catch {
    return DEFAULT_CLEAN_OPTIONS
  }
}

function saveCleanOptions(opts: CleanOptions) {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(opts))
  } catch {
    // Not remembered this time; the choice still applies until reload
  }
}

const mapOptions = (opts: CleanOptions, fn: (on: boolean) => boolean) =>
  Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, fn(v)])) as CleanOptions

function RuleLine({ rule }: { rule: CleanRule }) {
  return (
    <li className="flex flex-col gap-0.5 text-xs leading-relaxed">
      <span className="text-foreground">{rule.does}</span>
      {rule.why && <span className="text-muted-foreground">{rule.why}</span>}
    </li>
  )
}

/* ── What Clean changes, chosen ──
   Clean changes markup the person pasted, so every rule is listed with the
   reason for it, and each can be turned off. The button itself stays one
   click: the choices live here for whoever goes looking. A tooltip could not
   hold this — a link or a checkbox inside one is out of reach of a keyboard
   or a touch screen. The text comes from clean.ts, next to the code it
   describes, so the two cannot drift apart. */
function CleanOptionsDialog({
  options,
  onChange,
}: {
  options: CleanOptions
  onChange: (next: CleanOptions) => void
}) {
  const kept = [...Object.entries(KEPT_ATTRS), ...Object.entries(LINK_ATTRS)]
  const isDefault = Object.entries(DEFAULT_CLEAN_OPTIONS).every(
    ([k, v]) => options[k as keyof CleanOptions] === v,
  )
  const allOn = Object.values(options).every(Boolean)

  return (
    <Dialog>
      <DialogTrigger className="self-start rounded-sm text-xs text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 transition-colors outline-none hover:text-foreground hover:decoration-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50">
        Choose what Clean changes
      </DialogTrigger>
      <DialogContent>
        <div className="flex flex-col gap-1 border-b p-4 pr-12">
          <DialogTitle>What Clean changes</DialogTitle>
          <DialogDescription>
            Pick what runs when you press Clean. Anything Clean cannot decide is listed under the
            editor, and Undo puts the original markup back.
          </DialogDescription>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto p-4">
          {CLEAN_OPTIONS.map(({ group, options: groupOptions }) => (
            <section key={group} className="flex flex-col gap-3">
              <h3 className="text-xs font-medium text-muted-foreground">{group}</h3>
              {groupOptions.map((o) => {
                const id = `clean-${o.key}`
                return (
                  <div key={o.key} className="flex gap-2.5">
                    <Checkbox
                      id={id}
                      className="mt-px"
                      checked={options[o.key]}
                      onCheckedChange={(on) => onChange({ ...options, [o.key]: on })}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={id} className="cursor-pointer text-[13px] font-medium">
                        {o.label}
                      </label>
                      {o.rules.length > 0 && (
                        <ul className="flex flex-col gap-2">
                          {o.rules.map((r) => (
                            <RuleLine key={r.does} rule={r} />
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              })}
              {group === 'Attributes' && (
                <details className="rounded-lg border bg-muted/40 text-xs">
                  <summary className="cursor-pointer rounded-lg px-3 py-2 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                    Attributes that are always kept ({kept.length})
                  </summary>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 px-3 pb-3 leading-relaxed">
                    {kept.map(([name, why]) => (
                      <div key={name} className="contents">
                        <dt className="font-mono text-[0.95em] text-foreground">{name}</dt>
                        <dd className="text-muted-foreground">{why}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
              {group === 'Wrappers' && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  An element still carrying an attribute you keep — an id, a class, an
                  aria-label — is left in place, so nothing you chose to keep is lost to an unwrap.
                </p>
              )}
            </section>
          ))}
        </div>
        <div className="flex justify-end gap-1.5 border-t p-3">
          <Button
            variant="outline"
            size="xs"
            disabled={allOn}
            onClick={() => onChange(mapOptions(options, () => true))}
          >
            Select all
          </Button>
          <Button
            variant="outline"
            size="xs"
            disabled={isDefault}
            onClick={() => onChange(DEFAULT_CLEAN_OPTIONS)}
          >
            Reset to defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── The markup going in ──
   Its own card, above the preview, so the table renders under the markup it
   came from. */
export function HtmlPanel({
  html,
  onHtmlChange,
  onPaste,
  onFormat,
  onClean,
  report,
  onUndoClean,
}: {
  html: string
  onHtmlChange: (v: string) => void
  onPaste: () => void
  onFormat: () => void
  onClean: (opts: CleanOptions) => void
  report: CleanReport | null
  onUndoClean: () => void
}) {
  const htmlRef = useRef<HTMLTextAreaElement>(null)
  const [cleanOptions, setCleanOptions] = useState(loadCleanOptions)

  function changeCleanOptions(next: CleanOptions) {
    setCleanOptions(next)
    saveCleanOptions(next)
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
            <Button variant="outline" size="xs" onClick={() => onClean(cleanOptions)}>
              Clean
            </Button>
            <InfoTip>
              Format re-indents the markup without changing it. Clean removes the styling and
              page scaffolding a copied table brings with it. Undo puts the original back.
            </InfoTip>
          </div>
        </div>
        <div className="group relative">
          <Textarea
            ref={htmlRef}
            value={html}
            onChange={(e) => onHtmlChange(e.target.value)}
            onPaste={onPaste}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className="max-h-72 min-h-44 resize-none font-mono text-xs leading-relaxed"
          />
          {html.trim() ? (
            <CopyButton text={html} onFallback={() => htmlRef.current?.select()} />
          ) : null}
        </div>
        <CleanOptionsDialog options={cleanOptions} onChange={changeCleanOptions} />
        {report && <CleanReportBlock report={report} onUndo={onUndoClean} />}
      </div>
    </section>
  )
}

/* ── The CSS coming out ──
   No card of its own: it shares one with the preview, under the table it
   styles. */
export function CssOutput({
  cssFormat,
  onCssFormatChange,
  cssOut,
}: {
  cssFormat: CssFormat
  onCssFormatChange: (v: CssFormat) => void
  cssOut: string
}) {
  const preRef = useRef<HTMLPreElement>(null)
  const inline = cssFormat === 'inline'

  function selectPre() {
    const pre = preRef.current
    if (!pre) return
    const r = document.createRange()
    r.selectNodeContents(pre)
    const s = getSelection()
    s?.removeAllRanges()
    s?.addRange(r)
  }

  return (
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
        </div>
      </div>
      <div className="group relative">
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
        {cssOut.trim() ? <CopyButton text={cssOut} onFallback={selectPre} /> : null}
      </div>
    </div>
  )
}
