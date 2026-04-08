'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DECK_LISTING_IMAGE_ACCEPT,
  MAX_DECK_LISTING_IMAGES,
  MAX_DECK_LISTING_IMAGE_BYTES,
  MAX_DECK_LISTING_IMAGE_DIMENSION,
  MAX_DECK_LISTING_IMAGE_TOTAL_BYTES,
  MIN_DECK_LISTING_IMAGE_SHORT_EDGE,
  type DeckListingImage,
} from '@/lib/decks/listing-images'

type PreparedImage = {
  file: File
  width: number
  height: number
}

async function loadImageFromFile(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error(`Failed to read ${file.name}.`))
      nextImage.src = objectUrl
    })

    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function compressDeckListingImage(file: File): Promise<PreparedImage> {
  const image = await loadImageFromFile(file)
  const shortEdge = Math.min(image.naturalWidth, image.naturalHeight)

  if (shortEdge < MIN_DECK_LISTING_IMAGE_SHORT_EDGE) {
    throw new Error(
      `${file.name} is too small. Use a photo with at least ${MIN_DECK_LISTING_IMAGE_SHORT_EDGE}px on the shorter side.`
    )
  }

  let targetWidth = image.naturalWidth
  let targetHeight = image.naturalHeight

  const longestEdge = Math.max(targetWidth, targetHeight)
  if (longestEdge > MAX_DECK_LISTING_IMAGE_DIMENSION) {
    const scale = MAX_DECK_LISTING_IMAGE_DIMENSION / longestEdge
    targetWidth = Math.max(1, Math.round(targetWidth * scale))
    targetHeight = Math.max(1, Math.round(targetHeight * scale))
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Your browser could not prepare the image for upload.')
  }

  let quality = 0.84
  let attempts = 0
  let outputBlob: Blob | null = null

  while (attempts < 6) {
    canvas.width = targetWidth
    canvas.height = targetHeight
    context.clearRect(0, 0, targetWidth, targetHeight)
    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    outputBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    )

    if (outputBlob && outputBlob.size <= MAX_DECK_LISTING_IMAGE_BYTES) {
      break
    }

    quality -= 0.08
    if (quality < 0.56) {
      quality = 0.72
      const scaledWidth = Math.max(1, Math.round(targetWidth * 0.85))
      const scaledHeight = Math.max(1, Math.round(targetHeight * 0.85))
      const scaledShortEdge = Math.min(scaledWidth, scaledHeight)
      const floorScale =
        scaledShortEdge < MIN_DECK_LISTING_IMAGE_SHORT_EDGE
          ? MIN_DECK_LISTING_IMAGE_SHORT_EDGE / scaledShortEdge
          : 1
      targetWidth = Math.round(scaledWidth * floorScale)
      targetHeight = Math.round(scaledHeight * floorScale)
    }
    attempts += 1
  }

  if (!outputBlob || outputBlob.size > MAX_DECK_LISTING_IMAGE_BYTES) {
    throw new Error(
      `${file.name} is still too large after compression. Try a tighter crop or a less detailed photo.`
    )
  }

  const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'deck-photo'
  return {
    file: new File([outputBlob], `${normalizedName}.jpg`, { type: 'image/jpeg' }),
    width: targetWidth,
    height: targetHeight,
  }
}

function formatMb(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

export default function DeckListingImageManager({
  deckId,
  initialImages,
}: {
  deckId: number
  initialImages: DeckListingImage[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [images, setImages] = useState(initialImages)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function refreshWithResponse(response: Response) {
    const payload = (await response.json()) as { error?: string; images?: DeckListingImage[] }

    if (!response.ok) {
      throw new Error(payload.error || 'Something went wrong while updating listing images.')
    }

    setImages(payload.images ?? [])
    setError(null)
    router.refresh()
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? [])
    if (selectedFiles.length === 0) {
      return
    }

    if (images.length + selectedFiles.length > MAX_DECK_LISTING_IMAGES) {
      setError(`You can keep up to ${MAX_DECK_LISTING_IMAGES} listing images per deck.`)
      event.target.value = ''
      return
    }

    startTransition(() => {
      void (async () => {
        try {
          setMessage('Preparing images for upload...')
          setError(null)

          const preparedImages = await Promise.all(
            selectedFiles.map(async (file) => {
              if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                throw new Error('Only JPEG, PNG, and WebP images are supported.')
              }

              return compressDeckListingImage(file)
            })
          )

          const totalBytes =
            images.reduce((sum, image) => sum + Number(image.file_size_bytes ?? 0), 0) +
            preparedImages.reduce((sum, image) => sum + image.file.size, 0)

          if (totalBytes > MAX_DECK_LISTING_IMAGE_TOTAL_BYTES) {
            throw new Error(
              `These images add up to more than ${formatMb(
                MAX_DECK_LISTING_IMAGE_TOTAL_BYTES
              )}. Upload fewer photos at once.`
            )
          }

          const formData = new FormData()
          for (const [index, preparedImage] of preparedImages.entries()) {
            formData.append('images', preparedImage.file)
            formData.append(`image_width_${index}`, String(preparedImage.width))
            formData.append(`image_height_${index}`, String(preparedImage.height))
          }

          const response = await fetch(`/api/decks/${deckId}/listing-images`, {
            method: 'POST',
            body: formData,
          })

          await refreshWithResponse(response)
          setMessage('Listing photos updated.')
        } catch (uploadError) {
          setMessage(null)
          setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
        } finally {
          if (inputRef.current) {
            inputRef.current.value = ''
          }
        }
      })()
    })
  }

  function handleDelete(imageId: number) {
    startTransition(() => {
      void (async () => {
        try {
          setMessage('Removing image...')
          setError(null)

          const response = await fetch(`/api/decks/${deckId}/listing-images?imageId=${imageId}`, {
            method: 'DELETE',
          })

          await refreshWithResponse(response)
          setMessage('Listing photos updated.')
        } catch (deleteError) {
          setMessage(null)
          setError(deleteError instanceof Error ? deleteError.message : 'Delete failed.')
        }
      })()
    })
  }

  function handleMakeCover(imageId: number) {
    startTransition(() => {
      void (async () => {
        try {
          setMessage('Updating cover image...')
          setError(null)

          const response = await fetch(`/api/decks/${deckId}/listing-images`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageId, action: 'make-cover' }),
          })

          await refreshWithResponse(response)
          setMessage('Cover image updated.')
        } catch (patchError) {
          setMessage(null)
          setError(patchError instanceof Error ? patchError.message : 'Cover update failed.')
        }
      })()
    })
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Listing photos</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Upload up to {MAX_DECK_LISTING_IMAGES} photos to show the actual deck, box, sleeves,
            and condition. Images are resized before upload to keep the listing sharp without
            getting expensive to host.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-400/15">
          Add photos
          <input
            ref={inputRef}
            type="file"
            accept={DECK_LISTING_IMAGE_ACCEPT}
            multiple
            disabled={isPending || images.length >= MAX_DECK_LISTING_IMAGES}
            className="hidden"
            onChange={handleFilesSelected}
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-sm text-zinc-300">
        <div>Maximum {MAX_DECK_LISTING_IMAGES} photos per deck.</div>
        <div>Each photo is compressed to stay under {formatMb(MAX_DECK_LISTING_IMAGE_BYTES)}.</div>
        <div>Use a real photo with at least {MIN_DECK_LISTING_IMAGE_SHORT_EDGE}px on the short side.</div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {message && !error && (
        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      )}

      {images.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70"
            >
              <div className="aspect-[4/3] bg-black/30">
                <img
                  src={image.public_url}
                  alt={`Deck listing photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                  {index === 0 && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                      Cover image
                    </span>
                  )}
                  {image.width && image.height && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {image.width} x {image.height}
                    </span>
                  )}
                  {image.file_size_bytes && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {formatMb(image.file_size_bytes)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {index !== 0 && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleMakeCover(image.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:cursor-wait disabled:opacity-70"
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(image.id)}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/15 disabled:cursor-wait disabled:opacity-70"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-zinc-950/50 px-5 py-10 text-center text-sm text-zinc-400">
          No listing photos yet. Your imported commander art can still act as the cover until you add real deck photos.
        </div>
      )}
    </section>
  )
}
