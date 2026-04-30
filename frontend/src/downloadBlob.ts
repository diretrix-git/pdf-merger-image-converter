/**
 * Trigger a browser file download from a Blob.
 *
 * Creates a temporary object URL, programmatically clicks a hidden <a> element,
 * then immediately revokes the URL to free memory.
 *
 * @param blob     - The Blob to download.
 * @param filename - The suggested filename for the download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  // Revoke the object URL after a short delay to ensure the download starts
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
