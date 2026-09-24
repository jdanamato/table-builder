import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* The builder models "no modifier" as an empty class name, which is not a value
   a select can hold — an empty string reads as nothing chosen. The sentinel
   below stands in for it inside the control and is unwrapped on the way out, so
   the settings keep the empty string that means *default*. */
const NONE = '__none'

export type Option = { value: string; label: string }

export function OptionSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (v: string) => void
}) {
  const items = Object.fromEntries(options.map((o) => [o.value || NONE, o.label]))

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-foreground">{label}</span>
      <Select
        items={items}
        value={value || NONE}
        onValueChange={(v) => onChange(v === NONE ? '' : String(v))}
      >
        <SelectTrigger size="sm" className="min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || NONE} value={o.value || NONE}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
