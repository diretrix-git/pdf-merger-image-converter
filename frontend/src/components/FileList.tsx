import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FileEntry } from '../types'

interface FileListProps {
  files: FileEntry[]
  onRemove: (id: string) => void
  onReorder: (files: FileEntry[]) => void
  combinedSizeBytes?: number
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

/**
 * Drag-to-reorder file list — works on both desktop (mouse) and mobile (touch).
 *
 * Uses Pointer Events API instead of HTML5 DnD, which doesn't fire on touch.
 * The drag handle captures the pointer so movement is tracked globally even
 * when the finger/cursor leaves the handle element.
 *
 * Reorder logic: on pointer move, find which list item the pointer is over
 * by comparing clientY against each item's bounding rect midpoint.
 */
export function FileList({ files, onRemove, onReorder, combinedSizeBytes = 0 }: FileListProps) {
  const MAX_COMBINED = 50 * 1024 * 1024
  const usagePercent = Math.min((combinedSizeBytes / MAX_COMBINED) * 100, 100)
  const isOverLimit = combinedSizeBytes > MAX_COMBINED

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // Refs to each list item DOM node, keyed by file id
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())
  const draggingIdRef = useRef<string | null>(null)

  const getIndexAtY = useCallback((clientY: number): number => {
    let closest = files.length - 1
    let closestDist = Infinity
    files.forEach((f, i) => {
      const el = itemRefs.current.get(f.id)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      const dist = Math.abs(clientY - mid)
      if (dist < closestDist) {
        closestDist = dist
        closest = i
      }
    })
    return closest
  }, [files])

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    // Only respond to primary pointer (left mouse / first touch)
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingIdRef.current = id
    setDraggingId(id)
    setOverIndex(files.findIndex(f => f.id === id))
  }, [files])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingIdRef.current) return
    e.preventDefault()
    const idx = getIndexAtY(e.clientY)
    setOverIndex(idx)
  }, [getIndexAtY])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const sourceId = draggingIdRef.current
    if (!sourceId) return

    const targetIdx = getIndexAtY(e.clientY)
    const sourceIdx = files.findIndex(f => f.id === sourceId)

    if (sourceIdx !== targetIdx) {
      const next = [...files]
      const [moved] = next.splice(sourceIdx, 1)
      next.splice(targetIdx, 0, moved)
      onReorder(next)
    }

    draggingIdRef.current = null
    setDraggingId(null)
    setOverIndex(null)
  }, [files, getIndexAtY, onReorder])

  if (files.length === 0) return null

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
          {files.length} file{files.length !== 1 ? 's' : ''}
          {files.length > 1 && (
            <span className="ml-2 normal-case text-white/25">· drag to reorder</span>
          )}
        </p>
        <p className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : 'text-white/40'}`}>
          {formatSize(combinedSizeBytes)} / 50 MB
        </p>
      </div>

      {/* Storage bar */}
      <div className="w-full h-px bg-white/10 rounded-full mb-3 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-violet-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${usagePercent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      <ul className="flex flex-col gap-1.5" aria-label="Selected files">
        <AnimatePresence mode="popLayout" initial={false}>
          {files.map((entry, index) => {
            const isDragging = draggingId === entry.id
            const isDropTarget = overIndex === index && draggingId !== null && draggingId !== entry.id

            return (
              <motion.li
                key={entry.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(entry.id, el)
                  else itemRefs.current.delete(entry.id)
                }}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  border transition-all duration-150 select-none
                  ${isDragging
                    ? 'opacity-40 border-violet-500/50 bg-violet-950/30 scale-[0.98]'
                    : isDropTarget
                      ? 'border-violet-500/70 bg-violet-950/25 scale-[1.01]'
                      : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14]'
                  }
                `}
              >
                {/* Drag handle — pointer events attached here */}
                {files.length > 1 && (
                  <span
                    onPointerDown={(e) => handlePointerDown(e, entry.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="shrink-0 text-white/25 hover:text-white/60 active:text-violet-400
                               transition-colors text-base leading-none
                               cursor-grab active:cursor-grabbing touch-none"
                    aria-label="Drag to reorder"
                    role="button"
                    tabIndex={-1}
                  >
                    ⠿
                  </span>
                )}

                {/* Order badge */}
                <span
                  className="shrink-0 w-5 h-5 rounded-full bg-violet-900/50 text-violet-300
                             text-[10px] font-bold flex items-center justify-center"
                >
                  {index + 1}
                </span>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate" title={entry.name}>
                    {entry.name}
                  </p>
                  <p className="text-xs text-white/40">{formatSize(entry.sizeBytes)}</p>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                             text-white/30 hover:text-red-400 hover:bg-red-950/40
                             transition-colors focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label={`Remove ${entry.name}`}
                >
                  ×
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}
