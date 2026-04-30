import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Toast } from '../types'

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

/**
 * Individual toast notification.
 * Auto-dismisses after 5 seconds.
 */
function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const isSuccess = toast.type === 'success'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg
        text-sm font-medium max-w-sm w-full
        ${isSuccess
          ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-700'
          : 'bg-red-900/90 text-red-100 border border-red-700'
        }
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0 text-base" aria-hidden="true">
        {isSuccess ? '✓' : '✕'}
      </span>

      {/* Message */}
      <span className="flex-1">{toast.message}</span>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </motion.div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

/**
 * Fixed-position container that renders all active toasts.
 * Uses Framer Motion AnimatePresence for smooth enter/exit animations.
 */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
