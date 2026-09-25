import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cn } from "cn"

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  outline:
    "border-border bg-background hover:bg-muted aria-expanded:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  ghost: "hover:bg-muted aria-expanded:bg-muted dark:hover:bg-muted/50",
}

const sizes = {
  default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-start]:pl-2",
  sm: "h-7 gap-1 rounded-md px-2.5 has-data-[icon=inline-start]:pl-1.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
  xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-7 rounded-md",
}

type ButtonProps = ButtonPrimitive.Props & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

export { Button }
