import { useRef } from 'react'
import { UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/* ── Logo ──
   A logo stands in for the brand text rather than sitting beside it, so the
   text field and the upload button give way to the preview once one is set.
   The header and the footer each keep their own. */
export function LogoField({
  label,
  text,
  onTextChange,
  placeholder,
  logo,
  onLogoChange,
}: {
  label: string
  text: string
  onTextChange: (v: string) => void
  placeholder: string
  logo: string | null
  onLogoChange: (v: string | null) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  function read(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => onLogoChange(String(e.target?.result ?? ''))
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>

      {logo ? (
        <div className="flex items-center gap-2">
          <img
            src={logo}
            alt="Logo"
            className="block h-auto max-h-8 w-auto max-w-36 shrink-0 rounded outline outline-offset-[-1px] outline-border"
          />
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              onLogoChange(null)
              if (fileRef.current) fileRef.current.value = ''
            }}
          >
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            value={text}
            placeholder={placeholder}
            onChange={(e) => onTextChange(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon data-icon="inline-start" />
            Image
          </Button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => read(e.target.files?.[0])}
      />
    </div>
  )
}
