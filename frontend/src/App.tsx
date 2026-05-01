import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LocomotiveScroll from 'locomotive-scroll'
import 'locomotive-scroll/dist/locomotive-scroll.css'

import { UploadZone } from './components/UploadZone'
import { FileList } from './components/FileList'
import { ActionButtons } from './components/ActionButtons'
import { ToastContainer } from './components/ToastContainer'
import { DownloadModal } from './components/DownloadModal'
import { Navbar } from './components/Navbar'
import { CustomCursor } from './components/CustomCursor'
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

  // Download modal state
  const [downloadModal, setDownloadModal] = useState<{
    open: boolean
    blob: Blob | null
    defaultName: string
    extension: string
  }>({ open: false, blob: null, defaultName: '', extension: '' })

  // Locomotive Scroll — desktop only (mobile uses native scroll)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const locomotiveRef = useRef<LocomotiveScroll | null>(null)

  useEffect(() => {
    // Disable Locomotive Scroll on touch devices — it conflicts with native touch scroll
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    if (isTouchDevice || !scrollContainerRef.current) return

    locomotiveRef.current = new LocomotiveScroll({
      el: scrollContainerRef.current,
      smooth: true,
      multiplier: 0.9,
    })
    // Expose instance so Navbar can use scrollTo for accurate section navigation
    ;(window as any).__locomotiveScroll = locomotiveRef.current
    return () => {
      locomotiveRef.current?.destroy()
      locomotiveRef.current = null
      delete (window as any).__locomotiveScroll
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
      setDownloadModal({ open: true, blob, defaultName: 'merged', extension: 'pdf' })
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const handleConvert = async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const { blob, type } = await convertToImages(state.files[0].file)
      const defaultName = type === 'png' ? 'page' : 'pages'
      setDownloadModal({ open: true, blob, defaultName, extension: type })
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const handleDownloadConfirm = (filename: string) => {
    if (downloadModal.blob) {
      downloadBlob(downloadModal.blob, filename)
      addToast({ type: 'success', message: `"${filename}" download started.` })
    }
    setDownloadModal({ open: false, blob: null, defaultName: '', extension: '' })
  }

  const handleDownloadCancel = () => {
    setDownloadModal({ open: false, blob: null, defaultName: '', extension: '' })
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
      {/* Custom cursor — dot + spring follower */}
      <CustomCursor />

      {/* Hide default cursor on desktop only */}
      <style>{`@media (hover: hover) and (pointer: fine) { * { cursor: none !important; } }`}</style>
      {/* ------------------------------------------------------------------ */}
      {/* Navbar                                                               */}
      {/* ------------------------------------------------------------------ */}
      <Navbar />

      {/* ------------------------------------------------------------------ */}
      {/* Hero + Tool section (combined)                                       */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="home"
        data-scroll-section
        className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-28 pb-16 overflow-hidden"
      >
        {/* Parallax background */}
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

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center max-w-2xl mb-10"
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              Merge
            </span>
            <span className="text-gray-200 font-light">Snap</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Merge multiple PDFs into one, or convert any PDF's pages into
            PNG images — processed in-memory, nothing stored.
          </p>
        </motion.div>

        {/* Tool card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="w-full max-w-xl flex flex-col gap-5"
        >
          {/* Upload zone */}
          <UploadZone
            onFilesAdded={handleFilesAdded}
            onToast={addToast}
            disabled={state.isLoading}
          />

          {/* File list with count + storage */}
          <AnimatePresence>
            {state.files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FileList
                  files={state.files}
                  onRemove={handleRemove}
                  combinedSizeBytes={combinedSizeBytes}
                />
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

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-12 text-gray-600 text-2xl"
          aria-label="Scroll down"
        >
          ↓
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How it works section                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="how-it-works"
        data-scroll-section
        className="min-h-screen py-24 px-6 flex flex-col items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl w-full"
        >
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-100">How it works</h2>
          <p className="text-center text-gray-500 mb-12 text-sm">Three steps, no sign-up required.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '📂',
                title: 'Upload',
                desc: 'Drag & drop your PDF files into the upload zone, or click to browse.',
              },
              {
                step: '02',
                icon: '⚙️',
                title: 'Process',
                desc: 'Choose Merge to combine files in order, or Convert to extract pages as PNGs.',
              },
              {
                step: '03',
                icon: '⬇️',
                title: 'Download',
                desc: 'Name your file and download it instantly. Nothing is stored on any server.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
              >
                <span className="text-xs font-mono text-violet-500 mb-3">{item.step}</span>
                <span className="text-3xl mb-3" aria-hidden="true">{item.icon}</span>
                <h3 className="font-semibold text-gray-100 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features section                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="features"
        data-scroll-section
        className="min-h-screen py-24 px-6 flex flex-col items-center justify-center bg-gray-900/30"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl w-full"
        >
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-100">Features</h2>
          <p className="text-center text-gray-500 mb-12 text-sm">Everything you need, nothing you don't.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: '🔗',
                title: 'Merge PDFs',
                desc: 'Combine any number of PDFs into a single file, preserving page order.',
              },
              {
                icon: '🖼️',
                title: 'Convert to Images',
                desc: 'Export every page of a PDF as a high-quality PNG at 150 DPI, zipped for easy download.',
              },
              {
                icon: '🔒',
                title: 'Privacy first',
                desc: 'All processing happens in-memory on the server. No files are written to disk or stored.',
              },
              {
                icon: '⚡',
                title: 'Fast & local',
                desc: 'Runs entirely on your machine. No cloud, no latency, no data leaving your network.',
              },
              {
                icon: '✏️',
                title: 'Custom filenames',
                desc: 'Name your output file before downloading — no more "merged (1).pdf" clutter.',
              },
              {
                icon: '🛡️',
                title: 'Validated uploads',
                desc: 'MIME type checked by content (not extension), size limits enforced, page count capped.',
              },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-violet-800/50 transition-colors"
              >
                <span className="text-2xl mb-3 block" aria-hidden="true">{feat.icon}</span>
                <h3 className="font-semibold text-gray-100 mb-1">{feat.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer
        data-scroll-section
        className="py-8 px-6 text-center text-xs text-gray-600 border-t border-gray-800"
      >
        <p>MergeSnap — runs locally, stores nothing.</p>
      </footer>

      {/* ------------------------------------------------------------------ */}
      {/* Download modal                                                       */}
      {/* ------------------------------------------------------------------ */}
      <DownloadModal
        open={downloadModal.open}
        defaultName={downloadModal.defaultName}
        extension={downloadModal.extension}
        onConfirm={handleDownloadConfirm}
        onCancel={handleDownloadCancel}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Toast notifications                                                  */}
      {/* ------------------------------------------------------------------ */}
      <ToastContainer toasts={state.toasts} onDismiss={dismissToast} />
    </div>
  )
}
