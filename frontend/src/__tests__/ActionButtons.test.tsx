import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActionButtons } from '../components/ActionButtons'

const MAX_COMBINED = 50 * 1024 * 1024

function renderButtons(overrides: Partial<Parameters<typeof ActionButtons>[0]> = {}) {
  const defaults = {
    fileCount: 2,
    combinedSizeBytes: 1024,
    isLoading: false,
    onMerge: vi.fn(),
    onConvert: vi.fn(),
    ...overrides,
  }
  render(<ActionButtons {...defaults} />)
  return defaults
}

describe('ActionButtons', () => {
  it('renders Merge and Convert buttons', () => {
    renderButtons()
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /convert to images/i })).toBeInTheDocument()
  })

  it('disables both buttons when fileCount is 0', () => {
    renderButtons({ fileCount: 0 })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /convert to images/i })).toBeDisabled()
  })

  it('disables merge button when only 1 file is staged', () => {
    renderButtons({ fileCount: 1 })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()
  })

  it('disables convert button when more than 1 file is staged', () => {
    renderButtons({ fileCount: 3 })
    expect(screen.getByRole('button', { name: /convert to images/i })).toBeDisabled()
  })

  it('enables merge button when 2+ files are staged', () => {
    renderButtons({ fileCount: 2 })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).not.toBeDisabled()
  })

  it('enables convert button when exactly 1 file is staged', () => {
    renderButtons({ fileCount: 1 })
    expect(screen.getByRole('button', { name: /convert to images/i })).not.toBeDisabled()
  })

  it('disables both buttons when combined size exceeds 50 MB', () => {
    renderButtons({ fileCount: 2, combinedSizeBytes: MAX_COMBINED + 1 })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /convert to images/i })).toBeDisabled()
  })

  it('shows an over-limit warning when combined size exceeds 50 MB', () => {
    renderButtons({ fileCount: 2, combinedSizeBytes: MAX_COMBINED + 1 })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/combined size exceeds 50 mb/i)).toBeInTheDocument()
  })

  it('disables both buttons when isLoading is true', () => {
    renderButtons({ isLoading: true })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /convert to images/i })).toBeDisabled()
  })

  it('re-enables buttons when isLoading returns to false', () => {
    const { rerender } = render(
      <ActionButtons
        fileCount={2}
        combinedSizeBytes={1024}
        isLoading={true}
        onMerge={vi.fn()}
        onConvert={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()

    rerender(
      <ActionButtons
        fileCount={2}
        combinedSizeBytes={1024}
        isLoading={false}
        onMerge={vi.fn()}
        onConvert={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /merge pdfs/i })).not.toBeDisabled()
  })

  it('calls onMerge when the Merge button is clicked', () => {
    const { onMerge } = renderButtons({ fileCount: 2 })
    fireEvent.click(screen.getByRole('button', { name: /merge pdfs/i }))
    expect(onMerge).toHaveBeenCalledOnce()
  })

  it('calls onConvert when the Convert button is clicked', () => {
    const { onConvert } = renderButtons({ fileCount: 1 })
    fireEvent.click(screen.getByRole('button', { name: /convert to images/i }))
    expect(onConvert).toHaveBeenCalledOnce()
  })
})
