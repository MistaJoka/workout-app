import { PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE, PHOTO_MIME, fitWithin } from '../domain/progress/photos'

// Turns a picked/taken picture into what the app stores: decoded (EXIF
// orientation applied), scaled to PHOTO_MAX_EDGE on the long edge and
// re-encoded as JPEG through a canvas. Re-encoding keeps only pixels, so
// EXIF/GPS and every other metadata block is gone. Runs on the device; no
// network, no library.

export class PhotoDecodeError extends Error {
  constructor() {
    super("Couldn't read that picture")
    this.name = 'PhotoDecodeError'
  }
}

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void }

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      // Fall through to <img>, which some formats decode where bitmaps don't.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } catch {
    throw new PhotoDecodeError()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function encodeProgressPhoto(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const decoded = await decode(file)
  try {
    if (!decoded.width || !decoded.height) throw new PhotoDecodeError()
    const { width, height } = fitWithin(decoded.width, decoded.height, PHOTO_MAX_EDGE)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new PhotoDecodeError()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(decoded.source, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, PHOTO_MIME, PHOTO_JPEG_QUALITY))
    if (!blob) throw new PhotoDecodeError()
    return { blob, width, height }
  } finally {
    decoded.close()
  }
}
