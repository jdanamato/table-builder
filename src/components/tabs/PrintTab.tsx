import { PrinterIcon } from 'lucide-react'
import { CheckRow, Field, Hint, SectionLabel } from '@/components/Field'
import { LogoField } from '@/components/LogoField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { Settings } from '@/lib/mods'

export function PrintTab({
  settings,
  update,
  setView,
  onPrint,
  canPrint,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  /* Header and footer content is read at print time and never written onto the
     table, so none of it rewrites the markup. */
  setView: (patch: Partial<Settings>) => void
  onPrint: () => void
  canPrint: boolean
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3">
        <Field label="Title">
          <Input
            value={settings.title}
            placeholder="Optional title"
            onChange={(e) => update({ title: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={settings.desc}
            rows={2}
            placeholder="Optional description"
            className="min-h-0 resize-y"
            onChange={(e) => update({ desc: e.target.value })}
          />
        </Field>
        <Hint>
          Printed above the table in the PDF. Both sit beside the table rather than inside it, so
          neither joins the markup you copy — the caption is the part that does.
        </Hint>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <SectionLabel>Header</SectionLabel>
        <LogoField
          label="Left / logo"
          text={settings.brand}
          placeholder="Brand name"
          onTextChange={(v) => setView({ brand: v })}
          logo={settings.logo}
          onLogoChange={(v) => setView({ logo: v })}
        />
        <Field label="Right side">
          <Input
            value={settings.meta}
            placeholder="Contact info"
            onChange={(e) => setView({ meta: e.target.value })}
          />
        </Field>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <SectionLabel>Footer</SectionLabel>
        <div className="flex flex-col">
          <CheckRow
            label="Add footer"
            checked={settings.footer}
            onChange={(v) => setView({ footer: v })}
            tip="Prints a footer below the table, with the same rule and spacing as the header."
          />
          {settings.footer ? (
            <CheckRow
              label="Sync with header"
              checked={settings.footerSync}
              onChange={(v) => setView({ footerSync: v })}
              tip="Repeats the header's logo and contact line at the foot of the page. Uncheck to give the footer content of its own."
            />
          ) : null}
        </div>

        {/* Only worth showing once the footer is on and carrying content of its own. */}
        {settings.footer && !settings.footerSync ? (
          <div className="flex flex-col gap-3">
            <LogoField
              label="Left / logo"
              text={settings.footerBrand}
              placeholder="Footer text"
              onTextChange={(v) => setView({ footerBrand: v })}
              logo={settings.footerLogo}
              onLogoChange={(v) => setView({ footerLogo: v })}
            />
            <Field label="Right side">
              <Input
                value={settings.footerMeta}
                placeholder="Date, page note, disclaimer"
                onChange={(e) => setView({ footerMeta: e.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </div>

      <Separator />

      <Button onClick={onPrint} disabled={!canPrint} className="w-full">
        <PrinterIcon data-icon="inline-start" />
        Open for printing
      </Button>
    </div>
  )
}
