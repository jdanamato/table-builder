import { ChevronRightIcon } from 'lucide-react'
import { CheckRow, Field } from '@/components/Field'
import { OptionSelect } from '@/components/OptionSelect'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { Settings } from '@/lib/mods'

export function StyleTab({
  settings,
  update,
  setView,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  /* The sticky options are viewing aids: they change the preview and nothing
     else, so they never rewrite the markup. */
  setView: (patch: Partial<Settings>) => void
}) {
  const mod = (k: keyof Settings['mods']) => (v: boolean) =>
    update({ mods: { ...settings.mods, [k]: v } })

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col">
        <CheckRow label="Row lines" checked={settings.mods['row-lines']} onChange={mod('row-lines')} />
        <CheckRow label="Column lines" checked={settings.mods['col-lines']} onChange={mod('col-lines')} />
        <CheckRow
          label="Numeric"
          checked={settings.mods.numeric}
          onChange={mod('numeric')}
          tip="Right-aligns the figures, headers included, so a column reads straight down. The first column stays left-aligned, since it usually labels the row."
        />
        <CheckRow
          label="Remove card wrapper"
          checked={settings.mods.bare}
          onChange={mod('bare')}
          tip="Drops the card's border and background fill. The table keeps its rounded corners."
        />
        <CheckRow
          label="Sticky header"
          checked={settings.stickyHeader}
          onChange={(v) => setView({ stickyHeader: v })}
          tip="Preview only. Sticky cells need a scrolling container, so this is never written onto the table, the copied markup, or the print output."
        />
        <CheckRow
          label="Sticky first column"
          checked={settings.stickyFirst}
          onChange={(v) => setView({ stickyFirst: v })}
          tip="Preview only. Sticky cells need a scrolling container, so this is never written onto the table, the copied markup, or the print output."
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-2.5">
        <OptionSelect
          label="Striped rows"
          value={settings.stripeRows}
          onChange={(v) => update({ stripeRows: v })}
          options={[
            { value: '', label: 'None' },
            { value: 'zebra-odd', label: 'Odd' },
            { value: 'zebra-even', label: 'Even' },
          ]}
        />
        <OptionSelect
          label="Striped columns"
          value={settings.stripeCols}
          onChange={(v) => update({ stripeCols: v })}
          options={[
            { value: '', label: 'None' },
            { value: 'zebra-cols-odd', label: 'Odd' },
            { value: 'zebra-cols-even', label: 'Even' },
          ]}
        />
        <OptionSelect
          label="Size"
          value={settings.size}
          onChange={(v) => update({ size: v })}
          options={[
            { value: '', label: 'Default' },
            { value: 'size-1', label: 'Compact' },
            { value: 'size-3', label: 'Spacious' },
          ]}
        />
        <OptionSelect
          label="Corners"
          value={settings.radius}
          onChange={(v) => update({ radius: v })}
          options={[
            { value: 'radius-0', label: 'None' },
            { value: 'radius-1', label: 'Small' },
            { value: '', label: 'Medium' },
            { value: 'radius-3', label: 'Large' },
          ]}
        />
      </div>

      <Separator />

      <Collapsible>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="group flex w-full items-center gap-1.5 text-[13px] font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
            />
          }
        >
          <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
          Advanced
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Field
            label="Class prefix"
            hint={
              <>
                Namespaces every class this builder writes — <code>ad-</code> gives{' '}
                <code>ad-zebra-odd</code> — so the rules can drop into a site without colliding with
                what is already there.
              </>
            }
          >
            <Input
              value={settings.prefix}
              placeholder="none"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => update({ prefix: e.target.value })}
            />
          </Field>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
