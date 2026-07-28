import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
  tone?: 'danger' | 'default'
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirmar acción',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirming = false,
  tone = 'danger',
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!confirming}>
        <DialogHeader className="sm:text-left">
          <div className="mb-1 flex items-start gap-3">
            <div
              className={
                tone === 'danger'
                  ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive'
                  : 'flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
              }
            >
              <TriangleAlert className="size-4" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tone === 'danger' ? 'destructive' : 'default'}
            disabled={confirming}
            onClick={() => void onConfirm()}
          >
            {confirming ? 'Eliminando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
