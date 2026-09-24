import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* Radix ships each scale's dark values under `.dark`, and the semantic tokens
   are written once over the scale names — so switching themes is this class and
   nothing else. */
export function ThemeToggle() {
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setDark((d) => !d)}
    >
      {dark ? <MoonIcon /> : <SunIcon />}
    </Button>
  )
}
