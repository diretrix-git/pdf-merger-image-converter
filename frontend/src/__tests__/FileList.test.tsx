import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileList } from '../components/FileList'
import type { FileEntry } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    id: crypto.randomUUID(),
    file: new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' }),
    name: 'test.pdf',
    sizeBytes: 1024 * 512, // 512 KB
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FileList', () => {
  it('renders nothing when the file list is empty', () => {
    const { container } = render(<FileList files={[]} onRemove={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders each file with its name', () => {
    const files = [
      makeEntry({ name: 'document-a.pdf' }),
      makeEntry({ name: 'document-b.pdf' }),
    ]
    render(<FileList files={files} onRemove={vi.fn()} />)

    expect(screen.getByText('document-a.pdf')).toBeInTheDocument()
    expect(screen.getByText('document-b.pdf')).toBeInTheDocument()
  })

  it('renders each file with a human-readable size', () => {
    const files = [
      makeEntry({ name: 'small.pdf', sizeBytes: 512 * 1024 }), // 512 KB
      makeEntry({ name: 'large.pdf', sizeBytes: 2.5 * 1024 * 1024 }), // 2.5 MB
    ]
    render(<FileList files={files} onRemove={vi.fn()} />)

    expect(screen.getByText('512 KB')).toBeInTheDocument()
    expect(screen.getByText('2.5 MB')).toBeInTheDocument()
  })

  it('calls onRemove with the correct id when the remove button is clicked', () => {
    const onRemove = vi.fn()
    const entry = makeEntry({ name: 'to-remove.pdf', id: 'abc-123' })
    render(<FileList files={[entry]} onRemove={onRemove} />)

    const removeButton = screen.getByRole('button', { name: /remove to-remove\.pdf/i })
    fireEvent.click(removeButton)

    expect(onRemove).toHaveBeenCalledOnce()
    expect(onRemove).toHaveBeenCalledWith('abc-123')
  })

  it('shows the correct file count label', () => {
    const files = [makeEntry(), makeEntry(), makeEntry()]
    render(<FileList files={files} onRemove={vi.fn()} />)

    expect(screen.getByText(/3 files selected/i)).toBeInTheDocument()
  })

  it('shows singular label for a single file', () => {
    render(<FileList files={[makeEntry()]} onRemove={vi.fn()} />)
    expect(screen.getByText(/1 file selected/i)).toBeInTheDocument()
  })

  it('renders remove buttons for each file', () => {
    const files = [
      makeEntry({ name: 'a.pdf' }),
      makeEntry({ name: 'b.pdf' }),
    ]
    render(<FileList files={files} onRemove={vi.fn()} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(2)
  })
})
