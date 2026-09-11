import { createAdminClientOrNull } from '@/lib/supabase/admin'
import type { CommanderStapleData } from './value-signals'

type EdhrecCacheRow = {
  card_key: string
  commander_name?: string | null
  edhrec_rank?: number | null
  inclusion_percent?: number | null
  commander_deck_count?: number | null
}

// The EDHREC cache is RLS-locked with no user policy, so this read goes
// through the service-role client. Failures degrade to "no commander data"
// rather than breaking the page.
export async function getCommanderStapleDataByOracleId(
  oracleIds: string[]
): Promise<Map<string, CommanderStapleData>> {
  const best = new Map<string, CommanderStapleData>()
  const uniqueIds = Array.from(new Set(oracleIds.filter(Boolean)))
  if (uniqueIds.length === 0) return best

  const admin = createAdminClientOrNull()
  if (!admin) return best

  const { data, error } = await admin
    .from('edhrec_card_commander_recs')
    .select('card_key, commander_name, edhrec_rank, inclusion_percent, commander_deck_count')
    .eq('card_key_type', 'oracle_id')
    .eq('fetch_status', 'ok')
    .in('card_key', uniqueIds)

  if (error || !data) return best

  for (const row of data as EdhrecCacheRow[]) {
    const inclusion =
      typeof row.inclusion_percent === 'number' && Number.isFinite(row.inclusion_percent)
        ? row.inclusion_percent
        : null
    const current = best.get(row.card_key)
    const currentInclusion =
      typeof current?.inclusionPercent === 'number' ? current.inclusionPercent : -1

    if (!current || (inclusion ?? -1) > currentInclusion) {
      best.set(row.card_key, {
        commanderName: row.commander_name ?? null,
        inclusionPercent: inclusion,
        edhrecRank: row.edhrec_rank ?? null,
        commanderDeckCount: row.commander_deck_count ?? null,
      })
    }
  }

  return best
}
