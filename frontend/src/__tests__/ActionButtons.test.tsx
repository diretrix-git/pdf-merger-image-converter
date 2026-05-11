import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActionButtons } from '../components/ActionButtons'

const MAX_COMBINED = 50 * 1024 * 1024

function renderButtons(overrides: Partial<Parameters<typeof ActionButtons>[0]> = {}) {
  const defaults = {
    fileCount: 2,
    combinedSizeBytes: 1024,
    isLoading: false,
    imageFormat: 'png' as const,
    onFormatChange: vi.fn(),
    onMerge: vi.fn(),
    onConvert: vi.fn(),
    ...overrides,
  }
  render(<ActionButtons {...defaults} />)
  return defaults
}

// Helper — matches "Convert to PNG" or "Convert to JPG"
const convertBtn = () => screen.getByRole('button', { name: /convert to (png|jpg)/i })

describe('ActionButtons', () => {
  it('renders Merge and Convert buttons', () => {
    renderButtons()
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeInTheDocument()
    expect(convertBtn()).toBeInTheDocument()
  })

  it('disables both buttons when fileCount is 0', () => {
    renderButtons({ fileCount: 0 })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()
    expect(convertBtn()).toBeDisabled()
  })

  it('disables merge button when only 1 file is staged', () => {
    renderButtons({ fileCount: 1 })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()
  })

  it('disables convert button when more than 1 file is staged', () => {
    renderButtons({ fileCount: 3 })
    expect(convertBtn()).toBeDisabled()
  })

  it('enables merge button when 2+ files are staged', () => {
    renderButtons({ fileCount: 2 })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).not.toBeDisabled()
  })

  it('enables convert button when exactly 1 file is staged', () => {
    renderButtons({ fileCount: 1 })
    expect(convertBtn()).not.toBeDisabled()
  })

  it('disables both buttons when combined size exceeds 50 MB', () => {
    renderButtons({ fileCount: 2, combinedSizeBytes: MAX_COMBINED + 1 })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()
    expect(convertBtn()).toBeDisabled()
  })

  it('shows an over-limit warning when combined size exceeds 50 MB', () => {
    renderButtons({ fileCount: 2, combinedSizeBytes: MAX_COMBINED + 1 })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/combined size exceeds 50 mb/i)).toBeInTheDocument()
  })

  it('disables both buttons when isLoading is true', () => {
    renderButtons({ isLoading: true })
    expect(screen.getByRole('button', { name: /merge pdfs/i })).toBeDisabled()
    expect(convertBtn()).toBeDisabled()
  })

  it('re-enables buttons when isLoading returns to false', () => {
    const { rerender } = render(
      <ActionButtons
        fileCount={2}
        combinedSizeBytes={1024}
        isLoading={true}
        imageFormat="png"
        onFormatChange={vi.fn()}
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
        imageFormat="png"
        onFormatChange={vi.fn()}
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
    fireEvent.click(convertBtn())
    expect(onConvert).toHaveBeenCalledOnce()
  })

  it('shows PNG/JPG format toggle when exactly 1 file is staged', () => {
    renderButtons({ fileCount: 1 })
    expect(screen.getByRole('button', { name: /^PNG$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^JPG$/i })).toBeInTheDocument()
  })

  it('calls onFormatChange when JPG is selected', () => {
    const { onFormatChange } = renderButtons({ fileCount: 1 })
    fireEvent.click(screen.getByRole('button', { name: /^JPG$/i }))
    expect(onFormatChange).toHaveBeenCalledWith('jpg')
  })
})
