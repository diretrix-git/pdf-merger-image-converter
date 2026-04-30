/**
 * HTTP client for the PDF Merger & Image Converter backend API.
 *
 * Both functions build a FormData payload, POST to the Flask backend,
 * inspect the Content-Type of the response, and return a Blob on success.
 * On error they parse the JSON body and throw with the server's message.
 */

const BASE_URL = 'http://localhost:5000'

/**
 * Merge multiple PDF files into one.
 *
 * @param files - Array of File objects to merge, in display order.
 * @returns A Blob containing the merged PDF.
 * @throws Error with a human-readable message on validation or server error.
 */
export async function mergePdfs(files: File[]): Promise<Blob> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  const response = await fetch(`${BASE_URL}/merge`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse(response)
}

/**
 * Convert each page of a PDF to a PNG image, returned as a ZIP archive.
 *
 * @param file - The PDF file to convert.
 * @returns A Blob containing the ZIP archive of PNG images.
 * @throws Error with a human-readable message on validation or server error.
 */
export async function convertToImages(file: File): Promise<Blob> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BASE_URL}/to-images`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse(response)
}

/**
 * Shared response handler.
 *
 * Checks Content-Type before deciding how to parse the body.
 * Binary responses (PDF, ZIP) are returned as Blobs.
 * Error responses are parsed as JSON and thrown as Errors.
 */
async function handleResponse(response: Response): Promise<Blob> {
  const contentType = response.headers.get('Content-Type') ?? ''

  if (response.ok) {
    // Successful binary response — return as Blob for download
    if (
      contentType.includes('application/pdf') ||
      contentType.includes('application/zip') ||
      contentType.includes('application/octet-stream')
    ) {
      return response.blob()
    }

    // Unexpected content type on a 2xx — still try to return as blob
    return response.blob()
  }

  // Error response — parse JSON body for the error message
  if (contentType.includes('application/json')) {
    const body = await response.json() as { error?: string }
    throw new Error(body.error ?? `Request failed with status ${response.status}`)
  }

  // Non-JSON error (e.g. 413 from Flask's MAX_CONTENT_LENGTH)
  throw new Error(`Request failed with status ${response.status}`)
}
