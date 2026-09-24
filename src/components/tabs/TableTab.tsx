import { CheckRow, Field, Hint } from '@/components/Field'
import { Input } from '@/components/ui/input'
import type { Settings } from '@/lib/mods'

export function TableTab({
  settings,
  update,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Field label="Caption">
        <Input
          value={settings.captionSync ? settings.title : settings.caption}
          disabled={settings.captionSync}
          placeholder="Optional caption"
          onChange={(e) => update({ caption: e.target.value })}
        />
      </Field>

      <div className="flex flex-col">
        <CheckRow
          label="Sync with title"
          checked={settings.captionSync}
          onChange={(v) =>
            /* Unchecking leaves the mirrored text behind as the starting point
               for an edit. */
            update(v ? { captionSync: true } : { captionSync: false, caption: settings.title })
          }
          tip="Keeps the caption matching the printed title. Uncheck to caption the table with something of its own."
        />
        <CheckRow
          label="Visually hidden"
          checked={settings.captionHidden}
          onChange={(v) => update({ captionHidden: v })}
          tip="Keeps the caption in the markup as .sr-only — read by screen readers, not drawn on screen. The printed title is untouched."
        />
      </div>

      <Hint>
        The caption becomes the table's <code>&lt;caption&gt;</code>, so it travels with the copied
        markup. Typing here overwrites a caption already in the pasted HTML; an empty field leaves
        that one alone.
      </Hint>
    </div>
  )
}
