import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  buildGovernmentIdPath,
  getGovernmentIdExtension,
  GOVERNMENT_IDS_BUCKET,
  isAllowedGovernmentIdMimeType,
  isGovernmentIdStoragePath,
  MAX_GOVERNMENT_ID_BYTES,
} from '@/lib/profiles/government-id'

export const runtime = 'nodejs'

async function ensureGovernmentIdsBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) {
    throw new Error(error.message)
  }

  const existing = (buckets ?? []).find((bucket) => bucket.name === GOVERNMENT_IDS_BUCKET)
  if (existing) {
    return
  }

  const { error: createError } = await admin.storage.createBucket(GOVERNMENT_IDS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_GOVERNMENT_ID_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  })

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message)
  }
}

async function getCurrentStorageKey(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data } = await admin
    .from('profile_private')
    .select('government_id_storage_key')
    .eq('user_id', userId)
    .maybeSingle()

  return String(data?.government_id_storage_key ?? '').trim()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Sign in to upload an ID document.' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('document')

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'Choose a document to upload.' }, { status: 400 })
  }

  const mimeType = file.type.trim().toLowerCase()
  if (!isAllowedGovernmentIdMimeType(mimeType)) {
    return Response.json(
      { error: 'Only JPEG, PNG, WebP, or PDF documents are supported.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_GOVERNMENT_ID_BYTES) {
    return Response.json(
      { error: 'The document must stay under 5 MB.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  await ensureGovernmentIdsBucket(admin)

  const previousKey = await getCurrentStorageKey(admin, user.id)
  const storagePath = buildGovernmentIdPath(user.id, getGovernmentIdExtension(mimeType))
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from(GOVERNMENT_IDS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      cacheControl: '0',
      upsert: false,
    })

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: upsertError } = await admin
    .from('profile_private')
    .upsert(
      { user_id: user.id, government_id_storage_key: storagePath },
      { onConflict: 'user_id' }
    )

  if (upsertError) {
    await admin.storage.from(GOVERNMENT_IDS_BUCKET).remove([storagePath])
    return Response.json({ error: upsertError.message }, { status: 500 })
  }

  if (isGovernmentIdStoragePath(previousKey) && previousKey !== storagePath) {
    await admin.storage.from(GOVERNMENT_IDS_BUCKET).remove([previousKey])
  }

  return Response.json({ uploaded: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Sign in to manage your ID document.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const currentKey = await getCurrentStorageKey(admin, user.id)

  if (isGovernmentIdStoragePath(currentKey)) {
    await admin.storage.from(GOVERNMENT_IDS_BUCKET).remove([currentKey])
  }

  const { error: updateError } = await admin
    .from('profile_private')
    .update({ government_id_storage_key: null })
    .eq('user_id', user.id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ removed: true })
}
