import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runQshipDryRun } from '../data'

// Without the service role the dry run must fall back to sample data and
// still produce boxes that keep QShip's promises.
describe('runQshipDryRun (sample fallback)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(['starter', 'standard', 'collector'] as const)('builds a valid %s box from sample data', async (planKey) => {
    const result = await runQshipDryRun({ userId: null, planKey })
    expect(result.usingSampleInventory).toBe(true)
    expect(result.usingSampleMember).toBe(true)
    expect(result.notes.join(' ')).toMatch(/SUPABASE_SERVICE_ROLE_KEY/)

    const best = result.bundles[0]
    expect(best.bundle.valid).toBe(true)
    expect(best.economics.meetsValueGuarantee).toBe(true)
    expect(best.economics.meetsContributionFloor).toBe(true)
  })

  it('excludes owned and bulk cards and never boxes a spoiled reprint as a value pick', async () => {
    const result = await runQshipDryRun({ userId: null })
    expect(result.exclusionCounts.already_owned).toBeGreaterThanOrEqual(1)
    const rift = result.scored.find((c) => c.card.cardName === 'Cyclonic Rift')
    expect(rift?.slots).not.toContain('hold')
    expect(rift?.slots).not.toContain('spec')
    for (const entry of result.bundles) {
      for (const item of entry.bundle.items) {
        if (item.candidate.card.cardName === 'Cyclonic Rift') expect(item.slot).toBe('play')
      }
    }
  })

  it('leans on deck upgrades for a Player and on catalysts for a Speculator', async () => {
    const player = await runQshipDryRun({ userId: null, riskProfile: 'player' })
    const speculator = await runQshipDryRun({ userId: null, riskProfile: 'speculator' })
    const share = (result: typeof player, slot: 'play' | 'spec') =>
      result.bundles[0].bundle.slotValueUsd[slot] / result.bundles[0].bundle.marketValueUsd
    expect(share(player, 'play')).toBeGreaterThan(share(speculator, 'play'))
    expect(share(speculator, 'spec')).toBeGreaterThan(share(player, 'spec'))
  })
})
