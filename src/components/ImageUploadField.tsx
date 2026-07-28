import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  hint?: string
  currentUrl?: string | null
  aspect?: 'banner' | 'square' | 'portrait'
  busy?: boolean
  onUpload: (file: File) => Promise<void>
  onRemove?: () => Promise<void>
}

export function ImageUploadField({
  label,
  hint,
  currentUrl,
  aspect = 'banner',
  busy = false,
  onUpload,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const displayUrl = preview ?? currentUrl ?? null

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    try {
      await onUpload(file)
    } finally {
      setPreview(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
            Subir
          </Button>
          {displayUrl && onRemove ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void onRemove()}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-lg border bg-muted/30',
          aspect === 'banner' && 'aspect-[21/9]',
          aspect === 'square' && 'aspect-square max-w-[140px]',
          aspect === 'portrait' && 'aspect-[3/4] max-h-[280px]',
        )}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={label} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 p-4 text-center text-xs text-muted-foreground">
            <ImagePlus className="size-5 opacity-50" />
            JPG, PNG o WEBP · máx. 5 MB
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
