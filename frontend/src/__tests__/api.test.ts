/**
 * Unit tests for api.ts
 *
 * Uses vi.fn() to mock the global fetch and verifies that:
 * - Successful responses return Blobs
 * - Error responses throw with the correct message
 * - Network failures throw with a connectivity message
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergePdfs, convertToImages } from '../api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(
  ok: boolean,
  status: number,
  contentType: string,
  body: Blob | object
): Response {
  const isBlob = body instanceof Blob
  return {
    ok,
    status,
    headers: {
      get: (key: string) => (key === 'Content-Type' ? contentType : null),
    },
    blob: () => Promise.resolve(isBlob ? body : new Blob()),
    json: () => Promise.resolve(isBlob ? {} : body),
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// mergePdfs
// ---------------------------------------------------------------------------

describe('mergePdfs', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a Blob when the response is application/pdf', async () => {
    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse(true, 200, 'application/pdf', pdfBlob))
    )

    const files = [new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' })]
    const result = await mergePdfs(files)

    expect(result).toBeInstanceOf(Blob)
  })

  it('throws with the server error message on a 400 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse(false, 400, 'application/json', {
          error: 'At least two PDF files are required.',
        })
      )
    )

    const files = [new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' })]
    await expect(mergePdfs(files)).rejects.toThrow('At least two PDF files are required.')
  })

  it('throws with a status message when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse(false, 413, 'text/html', new Blob(['too large'])))
    )

    const files = [new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' })]
    await expect(mergePdfs(files)).rejects.toThrow('Request failed with status 413')
  })

  it('throws when fetch itself throws (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const files = [new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' })]
    await expect(mergePdfs(files)).rejects.toThrow('Failed to fetch')
  })
})

// ---------------------------------------------------------------------------
// convertToImages
// ---------------------------------------------------------------------------

describe('convertToImages', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns { blob, type: "zip" } when the response is application/zip', async () => {
    const zipBlob = new Blob(['PK'], { type: 'application/zip' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse(true, 200, 'application/zip', zipBlob))
    )

    const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' })
    const result = await convertToImages(file)

    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.type).toBe('zip')
  })

  it('returns { blob, type: "png" } when the response is image/png', async () => {
    const pngBlob = new Blob(['\x89PNG'], { type: 'image/png' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse(true, 200, 'image/png', pngBlob))
    )

    const file = new File(['%PDF-1.4'], 'single.pdf', { type: 'application/pdf' })
    const result = await convertToImages(file)

    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.type).toBe('png')
  })

  it('returns { blob, type: "jpg" } when the response is image/jpeg', async () => {
    const jpgBlob = new Blob(['\xff\xd8\xff'], { type: 'image/jpeg' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse(true, 200, 'image/jpeg', jpgBlob))
    )

    const file = new File(['%PDF-1.4'], 'single.pdf', { type: 'application/pdf' })
    const result = await convertToImages(file, 'jpg')

    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.type).toBe('jpg')
  })

  it('throws with the server error message on a 400 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse(false, 400, 'application/json', {
          error: 'PDF exceeds the 30-page limit (45 pages).',
        })
      )
    )

    const file = new File(['%PDF-1.4'], 'big.pdf', { type: 'application/pdf' })
    await expect(convertToImages(file)).rejects.toThrow(
      'PDF exceeds the 30-page limit (45 pages).'
    )
  })

  it('throws when fetch itself throws (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))

    const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' })
    await expect(convertToImages(file)).rejects.toThrow('Network error')
  })
})

// Worker overload/timeout keep the existing JSON error contract. The client
// surfaces the message without silently retrying and duplicating a PDF job.
describe.each([503, 504])('worker failure HTTP %i', (status) => {
  it.each(['merge', 'convert'] as const)('surfaces the JSON error for %s', async (operation) => {
    const message = status === 503 ? 'PDF processing is busy. Please retry shortly.' : 'PDF processing timed out after 60 seconds.'
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(false, status, 'application/json', { error: message }))
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['%PDF-1.4'], 'synthetic.pdf', { type: 'application/pdf' })
    await expect(operation === 'merge' ? mergePdfs([file, file]) : convertToImages(file, 'jpg')).rejects.toThrow(message)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
