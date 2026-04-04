export const PROFILE_VERIFICATION_TYPES = [
  'seller_attestation',
  'shipping_address',
  'government_id',
] as const

export type ProfileVerificationType = (typeof PROFILE_VERIFICATION_TYPES)[number]

export function formatVerificationType(type: string) {
  switch (type) {
    case 'seller_attestation':
      return 'Seller Attestation'
    case 'shipping_address':
      return 'Shipping Address'
    case 'government_id':
      return 'Government ID'
    default:
      return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase())
  }
}

export function normalizeVerificationStatus(status?: string | null) {
  return status?.trim().toLowerCase() || 'not_submitted'
}

export function formatVerificationStatus(status?: string | null) {
  switch (normalizeVerificationStatus(status)) {
    case 'submitted':
      return 'Submitted'
    case 'under_review':
      return 'Under Review'
    case 'verified':
      return 'Verified'
    case 'rejected':
      return 'Rejected'
    case 'needs_follow_up':
      return 'Needs Follow-Up'
    case 'not_submitted':
      return 'Not Submitted'
    default:
      return status ?? 'Not Submitted'
  }
}

export function verificationStatusTone(status?: string | null) {
  switch (normalizeVerificationStatus(status)) {
    case 'verified':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    case 'submitted':
    case 'under_review':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-100'
    case 'needs_follow_up':
      return 'border-sky-400/20 bg-sky-400/10 text-sky-100'
    case 'rejected':
      return 'border-red-400/20 bg-red-400/10 text-red-100'
    default:
      return 'border-white/10 bg-white/5 text-zinc-300'
  }
}

export function isVerificationInQueue(status?: string | null) {
  const normalized = normalizeVerificationStatus(status)
  return normalized === 'submitted' || normalized === 'under_review' || normalized === 'needs_follow_up'
}
