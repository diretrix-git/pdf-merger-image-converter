import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LocomotiveScroll from 'locomotive-scroll'
import 'locomotive-scroll/dist/locomotive-scroll.css'

// Layout & global UI
import { Navbar } from './components/Navbar'
import { CustomCursor } from './components/CustomCursor'
import { IntroLoader } from './components/IntroLoader'
import { DownloadModal } from './components/DownloadModal'
import { ToastContainer } from './components/ToastContainer'
import {
  AuroraBackground,
  DotGrid,
  NoiseLayer,
  GlobalStyles,
} from './components/BackgroundLayers'

// Page sections
import { HeroSection } from './sections/HeroSection'
import { HowItWorksSection } from './sections/HowItWorksSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { Footer } from './sections/Footer'

// Business logic
import { mergePdfs, convertToImages } from './api'
import { downloadBlob } from './downloadBlob'
import type { AppState, FileEntry, Toast } from './types'

// ---------------------------------------------------------------------------
// App — state management and API wiring only
// ---------------------------------------------------------------------------

export default function App() {
  const [introComplete, setIntroComplete] = useState(false)

  const [state, setState] = useState<AppState>({
    files: [],
    isLoading: false,
    toasts: [],
  })

  const [downloadModal, setDownloadModal] = useState<{
    open: boolean
    blob: Blob | null
    defaultName: string
    extension: string
  }>({ open: false, blob: null, defaultName: '', extension: '' })

  // Locomotive Scroll — initialised after the intro loader exits
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const locomotiveRef = useRef<LocomotiveScroll | null>(null)

  useEffect(() => {
    if (!introComplete || !scrollContainerRef.current) return

    locomotiveRef.current = new LocomotiveScroll({
      el: scrollContainerRef.current,
      smooth: true,
      multiplier: 0.9,
    })

    return () => {
      locomotiveRef.current?.destroy()
      locomotiveRef.current = null
    }
  }, [introComplete])

  // -------------------------------------------------------------------------
  // Toast helpers
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // File management
  // -------------------------------------------------------------------------

  const handleFilesAdded = useCallback((entries: FileEntry[]) => {
    setState((prev) => ({ ...prev, files: [...prev.files, ...entries] }))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== id),
    }))
  }, [])

  // -------------------------------------------------------------------------
  // API actions
  // -------------------------------------------------------------------------

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
      const blob = await convertToImages(state.files[0].file)
      setDownloadModal({ open: true, blob, defaultName: 'pages', extension: 'zip' })
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

  const combinedSizeBytes = state.files.reduce((sum, f) => sum + f.sizeBytes, 0)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Global: styles, background, cursor, loader                          */}
      {/* ------------------------------------------------------------------ */}
      <GlobalStyles />
      <AuroraBackground />
      <DotGrid />
      <NoiseLayer />
      <CustomCursor />
      <IntroLoader onComplete={() => setIntroComplete(true)} />

      {/* ------------------------------------------------------------------ */}
      {/* Main page — revealed after intro loader exits                       */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {introComplete && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div
              ref={scrollContainerRef}
              data-scroll-container
              className="relative z-10 min-h-screen bg-gray-950/80 text-gray-100 font-sans"
            >
              <Navbar />

              <HeroSection
                files={state.files}
                isLoading={state.isLoading}
                combinedSizeBytes={combinedSizeBytes}
                onFilesAdded={handleFilesAdded}
                onRemove={handleRemove}
                onToast={addToast}
                onMerge={handleMerge}
                onConvert={handleConvert}
              />

              <HowItWorksSection />

              <FeaturesSection />

              <Footer />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Overlays — always on top                                            */}
      {/* ------------------------------------------------------------------ */}
      <DownloadModal
        open={downloadModal.open}
        defaultName={downloadModal.defaultName}
        extension={downloadModal.extension}
        onConfirm={handleDownloadConfirm}
        onCancel={handleDownloadCancel}
      />

      <ToastContainer toasts={state.toasts} onDismiss={dismissToast} />
    </>
  )
}
