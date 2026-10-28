import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
  /** Visually hide the title (still announced by screen readers). */
  hideTitle?: boolean
}

/** Native <dialog>: modal focus containment, Escape to close, focus returned to the opener. */
export function Dialog({ open, onClose, title, children, className, hideTitle }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      opener.current = document.activeElement
      d.showModal()
    } else if (!open && d.open) {
      d.close()
    }
  }, [open])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const handleClose = () => {
      onClose()
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
    d.addEventListener('close', handleClose)
    return () => d.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className={cn(
        'm-auto max-h-[92dvh] w-[min(100vw-2rem,40rem)] rounded-lg bg-paper-2 p-0 text-ink backdrop:bg-black/75 open:animate-[dialog-in_.22s_var(--ease-out-soft)]',
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-4 bg-card px-5 py-3">
            <h2 id={titleId} className={cn('text-3xl', hideTitle && 'sr-only')}>
              {title}
            </h2>
            <button type="button" className="btn-ghost ml-auto -mr-2 size-11 p-0" onClick={() => ref.current?.close()} aria-label="Fechar">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
        </div>
      )}
      <style>{'@keyframes dialog-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}'}</style>
    </dialog>
  )
}
