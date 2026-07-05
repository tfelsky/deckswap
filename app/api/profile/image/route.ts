import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  buildProfileImagePath,
  getProfileImageExtension,
  isAllowedProfileImageMimeType,
  isProfileImageKind,
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_COLUMN,
  PROFILE_IMAGES_BUCKET,
  profileImagePrefix,
  type ProfileImageKind,
} from '@/lib/profiles/profile-images'

export const runtime = 'nodejs'

async function ensureProfileImagesBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) throw new Error(error.message)

  const existing = (buckets ?? []).find((bucket) => bucket.name === PROFILE_IMAGES_BUCKET)
  if (existing) return

  const { error: createError } = await admin.storage.createBucket(PROFILE_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: MAX_PROFILE_IMAGE_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message)
  }
}

// Remove any prior file for this user+kind so storage doesn't accumulate orphans.
async function removeExistingForKind(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  kind: ProfileImageKind
) {
  const { data: files } = await admin.storage.from(PROFILE_IMAGES_BUCKET).list(userId)
  const prefix = profileImagePrefix(kind)
  const stale = (files ?? [])
    .filter((file) => file.name.startsWith(prefix))
    .map((file) => `${userId}/${file.name}`)

  if (stale.length > 0) {
    await admin.storage.from(PROFILE_IMAGES_BUCKET).remove(stale)
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Sign in to upload a profile image.' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const kind = formData.get('kind')

  if (!isProfileImageKind(kind)) {
    return Response.json({ error: 'Choose an avatar or banner image.' }, { status: 400 })
  }

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'Choose an image to upload.' }, { status: 400 })
  }

  const mimeType = file.type.trim().toLowerCase()
  if (!isAllowedProfileImageMimeType(mimeType)) {
    return Response.json({ error: 'Only JPEG, PNG, or WebP images are supported.' }, { status: 400 })
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return Response.json({ error: 'The image must stay under 5 MB.' }, { status: 400 })
  }

  const admin = createAdminClient()
  await ensureProfileImagesBucket(admin)
  await removeExistingForKind(admin, user.id, kind)

  const storagePath = buildProfileImagePath({
    userId: user.id,
    kind,
    extension: getProfileImageExtension(mimeType),
  })
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicUrlData } = admin.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(storagePath)
  const publicUrl = publicUrlData.publicUrl
  const column = PROFILE_IMAGE_COLUMN[kind]

  const { error: upsertError } = await admin
    .from('profiles')
    .upsert({ user_id: user.id, [column]: publicUrl }, { onConflict: 'user_id' })

  if (upsertError) {
    await admin.storage.from(PROFILE_IMAGES_BUCKET).remove([storagePath])
    return Response.json({ error: upsertError.message }, { status: 500 })
  }

  return Response.json({ url: publicUrl })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Sign in to manage profile images.' }, { status: 401 })
  }

  const kind = new URL(request.url).searchParams.get('kind')
  if (!isProfileImageKind(kind)) {
    return Response.json({ error: 'Specify which image to remove.' }, { status: 400 })
  }

  const admin = createAdminClient()
  await removeExistingForKind(admin, user.id, kind)

  const column = PROFILE_IMAGE_COLUMN[kind]
  const { error: updateError } = await admin
    .from('profiles')
    .update({ [column]: null })
    .eq('user_id', user.id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ removed: true })
}
