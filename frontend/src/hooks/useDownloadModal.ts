import { useState } from 'react'

interface DownloadModalState {
  open: boolean
  blob: Blob | null
  defaultName: string
  extension: string
}

const CLOSED: DownloadModalState = {
  open: false,
  blob: null,
  defaultName: '',
  extension: '',
}

/**
 * Manages the download modal state — open with a blob, close after download.
 */
export function useDownloadModal() {
  const [modal, setModal] = useState<DownloadModalState>(CLOSED)

  const openModal = (blob: Blob, defaultName: string, extension: string) => {
    setModal({ open: true, blob, defaultName, extension })
  }

  const closeModal = () => {
    setModal(CLOSED)
  }

  return { modal, openModal, closeModal }
}
