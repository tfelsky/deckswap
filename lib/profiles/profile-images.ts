export const PROFILE_IMAGES_BUCKET = 'profile-images'
export const MAX_PROFILE_IMAGE_BYTES = 5_000_000

export const PROFILE_IMAGE_KINDS = ['avatar', 'banner'] as const
export type ProfileImageKind = (typeof PROFILE_IMAGE_KINDS)[number]

// Which profiles column each image kind writes to.
export const PROFILE_IMAGE_COLUMN: Record<ProfileImageKind, 'avatar_url' | 'banner_url'> = {
  avatar: 'avatar_url',
  banner: 'banner_url',
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function isProfileImageKind(value: unknown): value is ProfileImageKind {
  return typeof value === 'string' && (PROFILE_IMAGE_KINDS as readonly string[]).includes(value)
}

export function isAllowedProfileImageMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function getProfileImageExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'jpg'
  }
}

// Per-user, per-kind path. The timestamp keeps replacements from colliding with
// the CDN cache; old files for the same kind are cleaned up on upload.
export function buildProfileImagePath(args: {
  userId: string
  kind: ProfileImageKind
  extension: string
}): string {
  return `${args.userId}/${args.kind}-${Date.now()}.${args.extension}`
}

export function profileImagePrefix(kind: ProfileImageKind): string {
  return `${kind}-`
}
