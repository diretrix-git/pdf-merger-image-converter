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
import { HeroBlob } from './components/HeroBlob'
import { TiltCard } from './components/TiltCard'
import { StaggerText } from './components/StaggerText'
import { IntroLoader } from './components/IntroLoader'
import { mergePdfs, convertToImages } from './api'
import { downloadBlob } from './downloadBlob'
import type { AppState, FileEntry, Toast } from './types'

// ---------------------------------------------------------------------------
// Background layers
// ---------------------------------------------------------------------------

/** Noise texture overlay — breaks up flat color, adds depth */
function NoiseLayer() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[1]"
      aria-hidden="true"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
        opacity: 0.035,
        mixBlendMode: 'overlay',
      }}
    />
  )
}

/** Aurora / gradient mesh background — slow animated radial gradients */
function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
          top: '-20%',
          left: '-10%',
          animation: 'aurora1 18s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
          bottom: '10%',
          right: '-5%',
          animation: 'aurora2 22s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[80px]"
        style={{
          background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)',
          top: '40%',
          left: '40%',
          animation: 'aurora3 26s ease-in-out infinite alternate',
        }}
      />
    </div>
  )
}

/** Dot grid overlay */
function DotGrid() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// App
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Global background layers (fixed, behind everything) */}
      <AuroraBackground />
      <DotGrid />
      <NoiseLayer />

      {/* Custom cursor */}
      <CustomCursor />

      {/* Intro loader */}
      <IntroLoader onComplete={() => setIntroComplete(true)} />

      {/* Aurora keyframe styles */}
      <style>{`
        @keyframes aurora1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(8%, 12%) scale(1.15); }
        }
        @keyframes aurora2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-10%, -8%) scale(1.2); }
        }
        @keyframes aurora3 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(6%, -10%) scale(0.9); }
        }
        * { cursor: none !important; }
      `}</style>

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
              {/* Navbar */}
              <Navbar />

              {/* ---------------------------------------------------------- */}
              {/* Hero + Tool                                                  */}
              {/* ---------------------------------------------------------- */}
              <section
                id="home"
                data-scroll-section
                className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-16 overflow-hidden"
              >
                {/* 3D blob */}
                <HeroBlob />

                {/* Heading */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center max-w-2xl mb-10"
                >
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                    <StaggerText
                      text="PDF Merger & Image Converter"
                      className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent"
                      splitBy="words"
                    />
                  </h1>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-lg text-gray-400 leading-relaxed"
                  >
                    Merge multiple PDFs into one, or convert any PDF's pages into
                    downloadable PNG images — processed in-memory, nothing stored.
                  </motion.p>
                </motion.div>

                {/* Tool card */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-xl flex flex-col gap-5"
                >
                  <UploadZone
                    onFilesAdded={handleFilesAdded}
                    onToast={addToast}
                    disabled={state.isLoading}
                  />

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

              {/* ---------------------------------------------------------- */}
              {/* How it works                                                 */}
              {/* ---------------------------------------------------------- */}
              <section
                id="how-it-works"
                data-scroll-section
                className="py-24 px-6 flex flex-col items-center"
              >
                <div className="max-w-3xl w-full">
                  <h2 className="text-3xl font-bold text-center mb-2 text-gray-100">
                    <StaggerText text="How it works" splitBy="words" />
                  </h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center text-gray-500 mb-12 text-sm"
                  >
                    Three steps, no sign-up required.
                  </motion.p>

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
                      <TiltCard
                        key={item.step}
                        className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: i * 0.1 }}
                        >
                          <span className="text-xs font-mono text-violet-500 mb-3 block">{item.step}</span>
                          <span className="text-3xl mb-3 block" aria-hidden="true">{item.icon}</span>
                          <h3 className="font-semibold text-gray-100 mb-2">{item.title}</h3>
                          <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                        </motion.div>
                      </TiltCard>
                    ))}
                  </div>
                </div>
              </section>

              {/* ---------------------------------------------------------- */}
              {/* Features                                                     */}
              {/* ---------------------------------------------------------- */}
              <section
                id="features"
                data-scroll-section
                className="py-24 px-6 flex flex-col items-center"
              >
                <div className="max-w-4xl w-full">
                  <h2 className="text-3xl font-bold text-center mb-2 text-gray-100">
                    <StaggerText text="Features" splitBy="words" />
                  </h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center text-gray-500 mb-12 text-sm"
                  >
                    Everything you need, nothing you don't.
                  </motion.p>

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
                      <TiltCard
                        key={feat.title}
                        className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: i * 0.07 }}
                        >
                          <span className="text-2xl mb-3 block" aria-hidden="true">{feat.icon}</span>
                          <h3 className="font-semibold text-gray-100 mb-1">{feat.title}</h3>
                          <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
                        </motion.div>
                      </TiltCard>
                    ))}
                  </div>
                </div>
              </section>

              {/* Footer */}
              <footer
                data-scroll-section
                className="py-8 px-6 text-center text-xs text-gray-600 border-t border-gray-800"
              >
                <p>PDF Merger &amp; Image Converter — runs locally, stores nothing.</p>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download modal */}
      <DownloadModal
        open={downloadModal.open}
        defaultName={downloadModal.defaultName}
        extension={downloadModal.extension}
        onConfirm={handleDownloadConfirm}
        onCancel={handleDownloadCancel}
      />

      {/* Toasts */}
      <ToastContainer toasts={state.toasts} onDismiss={dismissToast} />
    </>
  )
}
