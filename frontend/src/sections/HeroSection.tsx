import { motion, AnimatePresence } from 'framer-motion'
import { HeroBlob } from '../components/HeroBlob'
import { StaggerText } from '../components/StaggerText'
import { UploadZone } from '../components/UploadZone'
import { FileList } from '../components/FileList'
import { ActionButtons } from '../components/ActionButtons'
import type { FileEntry, Toast } from '../types'

interface HeroSectionProps {
  files: FileEntry[]
  isLoading: boolean
  combinedSizeBytes: number
  onFilesAdded: (entries: FileEntry[]) => void
  onRemove: (id: string) => void
  onToast: (toast: Omit<Toast, 'id'>) => void
  onMerge: () => void
  onConvert: () => void
}

export function HeroSection({
  files,
  isLoading,
  combinedSizeBytes,
  onFilesAdded,
  onRemove,
  onToast,
  onMerge,
  onConvert,
}: HeroSectionProps) {
  return (
    <section
      id="home"
      data-scroll-section
      className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-16 overflow-hidden"
    >
      {/* 3D distort blob — sits behind all content */}
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
          onFilesAdded={onFilesAdded}
          onToast={onToast}
          disabled={isLoading}
        />

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FileList
                files={files}
                onRemove={onRemove}
                combinedSizeBytes={combinedSizeBytes}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ActionButtons
          fileCount={files.length}
          combinedSizeBytes={combinedSizeBytes}
          isLoading={isLoading}
          onMerge={onMerge}
          onConvert={onConvert}
        />
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-12 text-gray-600 text-2xl select-none"
        aria-label="Scroll down"
      >
        ↓
      </motion.div>
    </section>
  )
}
