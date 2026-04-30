import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LocomotiveScroll from 'locomotive-scroll'
import 'locomotive-scroll/dist/locomotive-scroll.css'

import { UploadZone } from './components/UploadZone'
import { FileList } from './components/FileList'
import { ActionButtons } from './components/ActionButtons'
import { ToastContainer } from './components/ToastContainer'
import { mergePdfs, convertToImages } from './api'
import { downloadBlob } from './downloadBlob'
import type { AppState, FileEntry, Toast } from './types'

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [state, setState] = useState<AppState>({
    files: [],
    isLoading: false,
    toasts: [],
  })

  // Locomotive Scroll ref — attached to the main scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const locomotiveRef = useRef<LocomotiveScroll | null>(null)

  // Initialize Locomotive Scroll after mount; destroy on cleanup
  useEffect(() => {
    if (!scrollContainerRef.current) return

    locomotiveRef.current = new LocomotiveScroll({
      el: scrollContainerRef.current,
      smooth: true,
      multiplier: 0.9,
    })

    return () => {
      locomotiveRef.current?.destroy()
      locomotiveRef.current = null
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Toast helpers
  // ---------------------------------------------------------------------------

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    setState((prev) => ({
      ...prev,
      toasts: [...prev.toasts, { ...toast, id: crypto.randomUUID() }],
    }))
  }, [])

  const dismissToast = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      toasts: prev.toasts.filter((t) => t.id !== id),
    }))
  }, [])

  // ---------------------------------------------------------------------------
  // File management
  // ---------------------------------------------------------------------------

  const handleFilesAdded = useCallback((entries: FileEntry[]) => {
    setState((prev) => ({ ...prev, files: [...prev.files, ...entries] }))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setState((prev) => ({ ...prev, files: prev.files.filter((f) => f.id !== id) }))
  }, [])

  // ---------------------------------------------------------------------------
  // API actions
  // ---------------------------------------------------------------------------

  const handleMerge = async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const blob = await mergePdfs(state.files.map((e) => e.file))
      downloadBlob(blob, 'merged.pdf')
      addToast({ type: 'success', message: 'PDFs merged successfully! Download started.' })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      addToast({ type: 'error', message })
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const handleConvert = async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const blob = await convertToImages(state.files[0].file)
      downloadBlob(blob, 'pages.zip')
      addToast({ type: 'success', message: 'Conversion complete! Download started.' })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      addToast({ type: 'error', message })
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const combinedSizeBytes = state.files.reduce((sum, f) => sum + f.sizeBytes, 0)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={scrollContainerRef}
      data-scroll-container
      className="min-h-screen bg-gray-950 text-gray-100 font-sans"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Hero section                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section
        data-scroll-section
        className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden"
      >
        {/* Parallax background gradient */}
        <div
          data-scroll
          data-scroll-speed="-3"
          className="absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-gray-950 to-indigo-950/60" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        </div>

        {/* Hero content */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center max-w-2xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-6xl mb-6"
              aria-hidden="true"
            >
              📑
            </motion.div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              PDF Merger &amp; Image Converter
            </h1>

            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Merge multiple PDFs into one, or convert any PDF's pages into
              downloadable PNG images — all processed locally, nothing stored.
            </p>

            {/* Scroll cue */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-gray-600 text-2xl"
              aria-label="Scroll down"
            >
              ↓
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Main tool section                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section
        data-scroll-section
        className="min-h-screen flex items-start justify-center px-6 py-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-xl flex flex-col gap-6"
        >
          {/* Section heading */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-100 mb-1">Upload your PDFs</h2>
            <p className="text-sm text-gray-500">
              Select multiple files to merge, or a single file to convert to images.
            </p>
          </div>

          {/* Upload zone */}
          <UploadZone
            onFilesAdded={handleFilesAdded}
            onToast={addToast}
            disabled={state.isLoading}
          />

          {/* File list */}
          <AnimatePresence>
            {state.files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FileList files={state.files} onRemove={handleRemove} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <ActionButtons
            fileCount={state.files.length}
            combinedSizeBytes={combinedSizeBytes}
            isLoading={state.isLoading}
            onMerge={handleMerge}
            onConvert={handleConvert}
          />
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Toast notifications                                                  */}
      {/* ------------------------------------------------------------------ */}
      <ToastContainer toasts={state.toasts} onDismiss={dismissToast} />
    </div>
  )
}
