import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UploadZone } from '../components/UploadZone'
import type { FileEntry, Toast } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePdfFile(name = 'test.pdf'): File {
  const content = '%PDF-1.4 test content'
  return new File([content], name, { type: 'application/pdf' })
}

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new ArrayBuffer(sizeBytes)], name, { type })
}

function renderUploadZone(
  onFilesAdded = vi.fn<(entries: FileEntry[]) => void>(),
  onToast = vi.fn<(toast: Omit<Toast, 'id'>) => void>(),
  currentFileCount = 0
) {
  render(<UploadZone onFilesAdded={onFilesAdded} onToast={onToast} currentFileCount={currentFileCount} />)
  return { onFilesAdded, onToast }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UploadZone', () => {
  it('renders the upload zone with correct accessible label', () => {
    renderUploadZone()
    expect(screen.getByRole('button', { name: /upload pdf files/i })).toBeInTheDocument()
  })

  it('calls onFilesAdded with a valid PDF file', () => {
    const { onFilesAdded, onToast } = renderUploadZone()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const file = makePdfFile('valid.pdf')
    fireEvent.change(input, { target: { files: [file] } })

    expect(onFilesAdded).toHaveBeenCalledOnce()
    const entries: FileEntry[] = onFilesAdded.mock.calls[0][0]
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('valid.pdf')
    expect(entries[0].file).toBe(file)
    expect(typeof entries[0].id).toBe('string')
    expect(onToast).not.toHaveBeenCalled()
  })

  it('rejects a non-PDF file and shows an error toast', () => {
    const { onFilesAdded, onToast } = renderUploadZone()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const file = makeFile('image.png', 'image/png')
    fireEvent.change(input, { target: { files: [file] } })

    expect(onFilesAdded).not.toHaveBeenCalled()
    expect(onToast).toHaveBeenCalledOnce()
    expect(onToast.mock.calls[0][0].type).toBe('error')
    expect(onToast.mock.calls[0][0].message).toContain('image.png')
  })

  it('rejects a file exceeding 50 MB and shows an error toast', () => {
    const { onFilesAdded, onToast } = renderUploadZone()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    // Create a file object with a size property exceeding 50 MB
    const oversizedFile = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversizedFile, 'size', { value: 51 * 1024 * 1024 })

    fireEvent.change(input, { target: { files: [oversizedFile] } })

    expect(onFilesAdded).not.toHaveBeenCalled()
    expect(onToast).toHaveBeenCalledOnce()
    expect(onToast.mock.calls[0][0].type).toBe('error')
    expect(onToast.mock.calls[0][0].message).toContain('big.pdf')
  })

  it('accepts valid files and rejects invalid ones in the same drop', () => {
    const { onFilesAdded, onToast } = renderUploadZone()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const validFile = makePdfFile('valid.pdf')
    const invalidFile = makeFile('image.jpg', 'image/jpeg')

    fireEvent.change(input, { target: { files: [validFile, invalidFile] } })

    expect(onFilesAdded).toHaveBeenCalledOnce()
    expect(onFilesAdded.mock.calls[0][0]).toHaveLength(1)
    expect(onToast).toHaveBeenCalledOnce()
  })

  it('is disabled when the disabled prop is true', () => {
    const onFilesAdded = vi.fn()
    const onToast = vi.fn()
    render(<UploadZone onFilesAdded={onFilesAdded} onToast={onToast} disabled />)

    const zone = screen.getByRole('button')
    expect(zone).toHaveAttribute('aria-disabled', 'true')
  })

  it('rejects all files when currentFileCount is already at the 8-file limit', () => {
    const onFilesAdded = vi.fn()
    const onToast = vi.fn()
    render(
      <UploadZone
        onFilesAdded={onFilesAdded}
        onToast={onToast}
        currentFileCount={8}
      />
    )
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = makePdfFile('extra.pdf')
    fireEvent.change(input, { target: { files: [file] } })

    expect(onFilesAdded).not.toHaveBeenCalled()
    expect(onToast).toHaveBeenCalledOnce()
    expect(onToast.mock.calls[0][0].type).toBe('error')
  })
})
