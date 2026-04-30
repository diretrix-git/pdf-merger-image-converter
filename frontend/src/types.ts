/**
 * Shared TypeScript interfaces for the PDF Merger & Image Converter frontend.
 */

/**
 * Represents a single file staged for upload.
 * The id is used as the React key and Framer Motion AnimatePresence key.
 */
export interface FileEntry {
  /** Unique identifier — generated with crypto.randomUUID() */
  id: string
  /** The native File object from the browser */
  file: File
  /** file.name — cached for display */
  name: string
  /** file.size in bytes — cached for display and validation */
  sizeBytes: number
}

/**
 * A transient notification shown to the user.
 */
export interface Toast {
  /** Unique identifier for keying and dismissal */
  id: string
  /** Human-readable message to display */
  message: string
  /** Visual style — green for success, red for error */
  type: 'success' | 'error'
}

/**
 * Top-level application state managed in App.tsx via useState.
 */
export interface AppState {
  /** Files currently staged for upload */
  files: FileEntry[]
  /** True while an API request is in flight */
  isLoading: boolean
  /** Active toast notifications */
  toasts: Toast[]
}
