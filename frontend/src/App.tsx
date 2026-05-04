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
import { HowItWorksSection } from './components/HowItWorksSection'
import { FeaturesSection } from './components/FeaturesSection'
import { FAQSection } from './components/FAQSection'
import { CTASection } from './components/CTASection'
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
      // Clear files and revoke blob URL to prevent memory leaks
      setState(prev => ({ ...prev, files: [] }))
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
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>🔒</span>
            <span>Files are automatically deleted after processing and never stored permanently.</span>
          </div>
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
            currentFileCount={state.files.length}
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
      {/* How it works — horizontal accordion panels                          */}
      {/* ------------------------------------------------------------------ */}
      <HowItWorksSection />

      {/* ------------------------------------------------------------------ */}
      {/* Features — bento grid                                               */}
      {/* ------------------------------------------------------------------ */}
      <FeaturesSection />

      {/* ------------------------------------------------------------------ */}
      {/* FAQ                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <FAQSection />

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <CTASection />

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer
        data-scroll-section
        className="py-10 px-6 border-t border-gray-800/60"
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-black tracking-tighter">
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Merge</span>
            <span className="text-gray-500 font-light">Snap</span>
          </span>
          <p className="text-xs text-gray-600">Runs locally · stores nothing · open source</p>
          <div className="flex gap-4 text-xs text-gray-600">
            <a href="#home" className="hover:text-gray-400 transition-colors">Home</a>
            <a href="#how-it-works" className="hover:text-gray-400 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-gray-400 transition-colors">FAQ</a>
          </div>
        </div>
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
