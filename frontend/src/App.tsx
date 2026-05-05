import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LocomotiveScroll from 'locomotive-scroll'
import 'locomotive-scroll/dist/locomotive-scroll.css'

// Components
import { Navbar } from './components/Navbar'
import { CustomCursor } from './components/CustomCursor'
import { UploadZone } from './components/UploadZone'
import { FileList } from './components/FileList'
import { ActionButtons } from './components/ActionButtons'
import { DownloadModal } from './components/DownloadModal'
import { ToastContainer } from './components/ToastContainer'
import { ProcessingSkeleton } from './components/ui/ProcessingSkeleton'
import { PreLoader } from './components/ui/PreLoader'

// Page sections
import { HowItWorksSection } from './components/HowItWorksSection'
import { FeaturesSection } from './components/FeaturesSection'
import { FAQSection } from './components/FAQSection'
import { CTASection } from './components/CTASection'

// Hooks
import { useToasts } from './hooks/useToasts'
import { useFileManagement } from './hooks/useFileManagement'
import { useDownloadModal } from './hooks/useDownloadModal'

// Utilities
import { mergePdfs, convertToImages } from './api'
import { downloadBlob } from './downloadBlob'

export default function App() {
  const [isLoading, setIsLoading] = useState(false)

  // Custom hooks
  const { toasts, addToast, dismissToast } = useToasts()
  const { files, addFiles, removeFile, reorderFiles, clearFiles, combinedSizeBytes } = useFileManagement()
  const { modal, openModal, closeModal } = useDownloadModal()

  // Locomotive Scroll — desktop only
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const locomotiveRef = useRef<LocomotiveScroll | null>(null)

  useEffect(() => {
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    if (isTouchDevice || !scrollContainerRef.current) return

    locomotiveRef.current = new LocomotiveScroll({
      el: scrollContainerRef.current,
      smooth: true,
      multiplier: 0.9,
    })
    ;(window as any).__locomotiveScroll = locomotiveRef.current

    return () => {
      locomotiveRef.current?.destroy()
      locomotiveRef.current = null
      delete (window as any).__locomotiveScroll
    }
  }, [])

  // -------------------------------------------------------------------------
  // API actions
  // -------------------------------------------------------------------------

  const handleMerge = async () => {
    setIsLoading(true)
    try {
      const blob = await mergePdfs(files.map((e) => e.file))
      openModal(blob, 'merged', 'pdf')
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'An unexpected error occurred.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConvert = async () => {
    setIsLoading(true)
    try {
      const { blob, type } = await convertToImages(files[0].file)
      openModal(blob, type === 'png' ? 'page' : 'pages', type)
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'An unexpected error occurred.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadConfirm = (filename: string) => {
    if (modal.blob) {
      downloadBlob(modal.blob, filename)
      addToast({ type: 'success', message: `"${filename}" download started.` })
      clearFiles()
    }
    closeModal()
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <PreLoader onDone={() => {}} />

      <div
        ref={scrollContainerRef}
        data-scroll-container
        className="min-h-screen text-white font-sans"
        style={{ background: '#0d0d18' }}
      >
        <CustomCursor />
        <style>{`@media (hover: hover) and (pointer: fine) { * { cursor: none !important; } }`}</style>

        <Navbar />

        {/* Hero */}
        <section
          id="home"
          data-scroll-section
          className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pt-32 sm:pt-40 pb-16 overflow-hidden"
        >
          {/* Parallax background */}
          <div data-scroll data-scroll-speed="-3" className="absolute inset-0 -z-10" aria-hidden="true">
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
              <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">Merge</span>
              <span className="text-white/60 font-light">Snap</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              Merge multiple PDFs into one, or convert any PDF's pages into PNG images — processed in-memory, nothing stored.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
              <span>🔒</span>
              <span>Files are automatically deleted after processing and never stored permanently.</span>
            </div>
          </motion.div>

          {/* Tool */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            className="w-full max-w-xl flex flex-col gap-5"
          >
            <UploadZone
              onFilesAdded={addFiles}
              onToast={addToast}
              disabled={isLoading}
              currentFileCount={files.length}
            />

            <AnimatePresence mode="wait">
              {isLoading ? (
                <ProcessingSkeleton key="skeleton" />
              ) : (
                files.length > 0 && (
                  <motion.div
                    key="filelist"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FileList
                      files={files}
                      onRemove={removeFile}
                      onReorder={reorderFiles}
                      combinedSizeBytes={combinedSizeBytes}
                    />
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {!isLoading && (
              <ActionButtons
                fileCount={files.length}
                combinedSizeBytes={combinedSizeBytes}
                isLoading={isLoading}
                onMerge={handleMerge}
                onConvert={handleConvert}
              />
            )}
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-12 text-gray-600 text-2xl"
            aria-label="Scroll down"
          >
            ↓
          </motion.div>
        </section>

        <HowItWorksSection />
        <FeaturesSection />
        <FAQSection />
        <CTASection />

        {/* Footer */}
        <footer data-scroll-section className="py-10 px-6 border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm font-black tracking-tighter">
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Merge</span>
              <span className="text-white/50 font-light">Snap</span>
            </span>
            <p className="text-xs text-white/50">Runs locally · stores nothing · open source</p>
            <div className="flex gap-4 text-xs text-white/50">
              <a href="#home" className="hover:text-white transition-colors">Home</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>
          </div>
        </footer>

        <DownloadModal
          open={modal.open}
          defaultName={modal.defaultName}
          extension={modal.extension}
          onConfirm={handleDownloadConfirm}
          onCancel={closeModal}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </>
  )
}
