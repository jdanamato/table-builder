import { cn } from 'cn'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { InfoTip } from './InfoTip'

let n = 0
const nextId = () => `f${++n}`

/* A labelled control stacked over its input — the shape every text field in the
   panel takes. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  )
}

/* A checkbox, its label and an optional explanation, on one clickable row. */
export function CheckRow({
  checked,
  onChange,
  label,
  tip,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  tip?: React.ReactNode
}) {
  const id = nextId()
  return (
    <div className="flex items-center gap-2 rounded-md py-1">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer text-[13px] font-normal">
        {label}
      </Label>
      {tip ? <InfoTip>{tip}</InfoTip> : null}
    </div>
  )
}

/* A short explanation under a group of controls. */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11.5px] leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px]">
      {children}
    </p>
  )
}

/* A section heading inside a tab panel. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  )
}
