import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  buildDeckListingImagePath,
  DECK_LISTING_IMAGES_BUCKET,
  getDeckListingImageExtension,
  MAX_DECK_LISTING_IMAGES,
  MAX_DECK_LISTING_IMAGE_BYTES,
  MAX_DECK_LISTING_IMAGE_TOTAL_BYTES,
  sanitizeDeckListingImageRows,
} from '@/lib/decks/listing-images'

export const runtime = 'nodejs'

async function requireOwnedDeck(deckId: number, userId: string) {
  const admin = createAdminClient()
  const { data: deck, error } = await admin
    .from('decks')
    .select('id, user_id')
    .eq('id', deckId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !deck) {
    return null
  }

  return { admin, deck }
}

async function ensureDeckListingImageBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) {
    throw new Error(error.message)
  }

  const existing = (buckets ?? []).find((bucket) => bucket.name === DECK_LISTING_IMAGES_BUCKET)
  if (existing) {
    return
  }

  const { error: createError } = await admin.storage.createBucket(DECK_LISTING_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: MAX_DECK_LISTING_IMAGE_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message)
  }
}

async function syncDeckCoverImage(admin: ReturnType<typeof createAdminClient>, deckId: number) {
  const { data: imageRows } = await admin
    .from('deck_listing_images')
    .select('public_url, sort_order')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)

  const coverFromUploads = String(imageRows?.[0]?.public_url ?? '').trim() || null

  let nextImageUrl = coverFromUploads
  if (!nextImageUrl) {
    const { data: commanderRows } = await admin
      .from('deck_cards')
      .select('image_url')
      .eq('deck_id', deckId)
      .eq('section', 'commander')
      .order('sort_order', { ascending: true })
      .limit(1)

    nextImageUrl = String(commanderRows?.[0]?.image_url ?? '').trim() || null
  }

  await admin.from('decks').update({ image_url: nextImageUrl }).eq('id', deckId)
}

async function compactDeckImageSortOrder(admin: ReturnType<typeof createAdminClient>, deckId: number) {
  const { data } = await admin
    .from('deck_listing_images')
    .select('id')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  const rows = data ?? []
  await Promise.all(
    rows.map((row, index) =>
      admin.from('deck_listing_images').update({ sort_order: index + 1 }).eq('id', row.id)
    )
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Sign in to upload listing images.' }, { status: 401 })
  }

  const resolvedParams = await params
  const deckId = Number(resolvedParams.id)
  if (!Number.isFinite(deckId) || deckId <= 0) {
    return Response.json({ error: 'Invalid deck.' }, { status: 400 })
  }

  const ownership = await requireOwnedDeck(deckId, user.id)
  if (!ownership) {
    return Response.json({ error: 'Deck not found.' }, { status: 404 })
  }

  const formData = await request.formData()
  const files = formData
    .getAll('images')
    .filter((value): value is File => value instanceof File && value.size > 0)

  if (files.length === 0) {
    return Response.json({ error: 'Choose at least one image to upload.' }, { status: 400 })
  }

  const admin = ownership.admin
  await ensureDeckListingImageBucket(admin)

  const { data: existingRows, error: existingError } = await admin
    .from('deck_listing_images')
    .select('*')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 })
  }

  const existingImages = sanitizeDeckListingImageRows(existingRows)
  if (existingImages.length + files.length > MAX_DECK_LISTING_IMAGES) {
    return Response.json(
      {
        error: `You can keep up to ${MAX_DECK_LISTING_IMAGES} listing images per deck.`,
      },
      { status: 400 }
    )
  }

  const nextTotalBytes =
    existingImages.reduce((sum, image) => sum + Number(image.file_size_bytes ?? 0), 0) +
    files.reduce((sum, file) => sum + file.size, 0)
  if (nextTotalBytes > MAX_DECK_LISTING_IMAGE_TOTAL_BYTES) {
    return Response.json(
      {
        error: 'That upload set is too large. Try fewer images or compress them a bit more.',
      },
      { status: 400 }
    )
  }

  for (const file of files) {
    const mimeType = file.type.trim().toLowerCase()
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return Response.json(
        { error: 'Only JPEG, PNG, and WebP images are supported.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_DECK_LISTING_IMAGE_BYTES) {
      return Response.json(
        {
          error: `Each image must stay under ${Math.round(
            MAX_DECK_LISTING_IMAGE_BYTES / 1_000_000
          )} MB after compression.`,
        },
        { status: 400 }
      )
    }
  }

  const uploadedRows: Array<Record<string, unknown>> = []

  for (const [index, file] of files.entries()) {
    const mimeType = file.type.trim().toLowerCase() || 'image/jpeg'
    const extension = getDeckListingImageExtension(mimeType)
    const storagePath = buildDeckListingImagePath({
      deckId,
      userId: user.id,
      extension,
    })
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await admin.storage
      .from(DECK_LISTING_IMAGES_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: false,
      })

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrlData } = admin.storage
      .from(DECK_LISTING_IMAGES_BUCKET)
      .getPublicUrl(storagePath)

    uploadedRows.push({
      deck_id: deckId,
      user_id: user.id,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      width: Number(formData.get(`image_width_${index}`) || 0) || null,
      height: Number(formData.get(`image_height_${index}`) || 0) || null,
      file_size_bytes: file.size,
      mime_type: mimeType,
      sort_order: existingImages.length + index + 1,
    })
  }

  const { error: insertError } = await admin.from('deck_listing_images').insert(uploadedRows)
  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 })
  }

  await syncDeckCoverImage(admin, deckId)

  const { data: refreshedRows, error: refreshedError } = await admin
    .from('deck_listing_images')
    .select('*')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (refreshedError) {
    return Response.json({ error: refreshedError.message }, { status: 500 })
  }

  return Response.json({ images: sanitizeDeckListingImageRows(refreshedRows) })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Sign in to manage listing images.' }, { status: 401 })
  }

  const resolvedParams = await params
  const deckId = Number(resolvedParams.id)
  const imageId = Number(new URL(request.url).searchParams.get('imageId'))
  if (!Number.isFinite(deckId) || deckId <= 0 || !Number.isFinite(imageId) || imageId <= 0) {
    return Response.json({ error: 'Invalid image request.' }, { status: 400 })
  }

  const ownership = await requireOwnedDeck(deckId, user.id)
  if (!ownership) {
    return Response.json({ error: 'Deck not found.' }, { status: 404 })
  }

  const admin = ownership.admin
  const { data: imageRow, error: imageError } = await admin
    .from('deck_listing_images')
    .select('id, storage_path')
    .eq('id', imageId)
    .eq('deck_id', deckId)
    .maybeSingle()

  if (imageError || !imageRow) {
    return Response.json({ error: 'Image not found.' }, { status: 404 })
  }

  if (imageRow.storage_path) {
    await admin.storage.from(DECK_LISTING_IMAGES_BUCKET).remove([imageRow.storage_path])
  }

  const { error: deleteError } = await admin
    .from('deck_listing_images')
    .delete()
    .eq('id', imageId)
    .eq('deck_id', deckId)

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 })
  }

  await compactDeckImageSortOrder(admin, deckId)
  await syncDeckCoverImage(admin, deckId)

  const { data: refreshedRows } = await admin
    .from('deck_listing_images')
    .select('*')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  return Response.json({ images: sanitizeDeckListingImageRows(refreshedRows) })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Sign in to manage listing images.' }, { status: 401 })
  }

  const resolvedParams = await params
  const deckId = Number(resolvedParams.id)
  if (!Number.isFinite(deckId) || deckId <= 0) {
    return Response.json({ error: 'Invalid deck.' }, { status: 400 })
  }

  const payload = (await request.json()) as { imageId?: number; action?: string }
  const imageId = Number(payload.imageId)
  if (!Number.isFinite(imageId) || imageId <= 0 || payload.action !== 'make-cover') {
    return Response.json({ error: 'Invalid image action.' }, { status: 400 })
  }

  const ownership = await requireOwnedDeck(deckId, user.id)
  if (!ownership) {
    return Response.json({ error: 'Deck not found.' }, { status: 404 })
  }

  const admin = ownership.admin
  const { data: rows, error } = await admin
    .from('deck_listing_images')
    .select('id')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const orderedIds = (rows ?? []).map((row) => Number(row.id)).filter((id) => id > 0)
  if (!orderedIds.includes(imageId)) {
    return Response.json({ error: 'Image not found.' }, { status: 404 })
  }

  const nextOrder = [imageId, ...orderedIds.filter((id) => id !== imageId)]
  await Promise.all(
    nextOrder.map((id, index) =>
      admin.from('deck_listing_images').update({ sort_order: index + 1 }).eq('id', id)
    )
  )
  await syncDeckCoverImage(admin, deckId)

  const { data: refreshedRows } = await admin
    .from('deck_listing_images')
    .select('*')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  return Response.json({ images: sanitizeDeckListingImageRows(refreshedRows) })
}
