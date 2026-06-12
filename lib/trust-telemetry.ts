import { headers } from 'next/headers'

function isTrustTelemetrySchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes('touch_profile_last_seen') ||
    message.includes('refresh_avg_trade_reply_hours') ||
    message.includes('profile_reputation_summary')
  )
}

async function readRequestIpCountry() {
  try {
    const headerList = await headers()
    return headerList.get('x-vercel-ip-country')?.trim() || null
  } catch {
    return null
  }
}

export async function touchProfileLastSeen(supabase: any) {
  try {
    const ipCountry = await readRequestIpCountry()
    const result = await supabase.rpc('touch_profile_last_seen', {
      p_ip_country: ipCountry,
    })

    if (result.error && !isTrustTelemetrySchemaMissing(result.error.message)) {
      console.error('Failed to touch profile last seen:', result.error)
    }
  } catch (error) {
    console.error('Failed to touch profile last seen:', error)
  }
}

export async function refreshAvgTradeReplyHours(supabase: any, userId: string) {
  try {
    const result = await supabase.rpc('refresh_avg_trade_reply_hours', {
      p_user_id: userId,
    })

    if (result.error && !isTrustTelemetrySchemaMissing(result.error.message)) {
      console.error('Failed to refresh avg trade reply hours:', result.error)
    }
  } catch (error) {
    console.error('Failed to refresh avg trade reply hours:', error)
  }
}
