import { InfoIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/* The explanations that used to ride on `title` attributes. A real tooltip
   gives them a delay, a position and a readable width — and, unlike `title`,
   reaches a keyboard. */
export function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            tabIndex={0}
            aria-label="More information"
            className="inline-flex shrink-0 cursor-help items-center text-muted-foreground/60 transition-colors hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none rounded-sm"
          />
        }
      >
        <InfoIcon className="size-3.5" />
      </TooltipTrigger>
      {/* The popup is a flex row by default, which would turn each text run and
          each inline <code> into its own column. Prose needs a block. */}
      <TooltipContent className="block max-w-72 py-2 text-pretty leading-relaxed [&_code]:rounded-sm [&_code]:bg-background/15 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.9em]">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
