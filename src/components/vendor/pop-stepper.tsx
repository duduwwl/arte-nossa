// Adapted from Watermelon UI — Pop Stepper (https://ui.watermelon.sh, registry pop-stepper). MIT License.
// Changes: controlled value, brand colors instead of next-themes, accessible labels and live value,
// disabled limits, compact sizing, no animation when the user prefers reduced motion.
import { Minus, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { cn, useReducedMotion } from '@/lib/utils'

interface PopStepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max: number
  label: string
  className?: string
}

export function PopStepper({ value, onChange, min = 1, max, label, className }: PopStepperProps) {
  const [incrementing, setIncrementing] = useState(true)
  const reduced = useReducedMotion()
  const set = (next: number) => {
    setIncrementing(next >= value)
    onChange(Math.max(min, Math.min(max, next)))
  }
  const btn =
    'grid size-11 place-items-center rounded-full bg-accent text-paper transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-card disabled:text-ink-2'

  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center gap-2', className)}>
      <motion.button type="button" whileTap={reduced ? undefined : { scale: 1.12 }} transition={{ duration: 0.15 }} className={btn} onClick={() => set(value - 1)} disabled={value <= min} aria-label="Diminuir quantidade">
        <Minus aria-hidden className="size-4" />
      </motion.button>
      <div className="inline-flex h-11 min-w-14 items-center justify-center overflow-hidden rounded-md bg-paper-2 px-3" aria-live="polite">
        <motion.span
          key={value}
          initial={false}
          animate={
            reduced
              ? undefined
              : { scale: [1, 1.25, 1.25, 1], rotate: [0, incrementing ? -14 : 14, incrementing ? -14 : 14, 0], color: ['#f4f4f2', '#f2c230', '#f4f4f2'] }
          }
          transition={{ duration: 0.4, times: [0, 0.4, 0.6, 1], ease: 'easeInOut' }}
          className="text-lg font-bold tabular-nums"
        >
          <span className="sr-only">Quantidade: </span>
          {value}
        </motion.span>
      </div>
      <motion.button type="button" whileTap={reduced ? undefined : { scale: 1.12 }} transition={{ duration: 0.15 }} className={btn} onClick={() => set(value + 1)} disabled={value >= max} aria-label="Aumentar quantidade">
        <Plus aria-hidden className="size-4" />
      </motion.button>
    </div>
  )
}
