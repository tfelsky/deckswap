'use server'

import { createClient } from '@/lib/supabase/server'
import { runArbitrageScan } from '@/lib/arber/scan'
import type { ScanResult } from '@/lib/arber/types'

export type ArberScanState = {
  error?: string
  result?: ScanResult
}

function numberFromForm(value: FormDataEntryValue | null): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export async function scanArbitrageAction(
  _prev: ArberScanState,
  formData: FormData
): Promise<ArberScanState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to scan for arbitrage.' }
  }

  const query = String(formData.get('query') ?? '').trim()
  if (!query) {
    return { error: 'Enter a search term, e.g. a card name or "commander staple".' }
  }

  // Optional advanced knobs from the form; percentages come in as 0-100.
  const offerPct = numberFromForm(formData.get('offerPct'))
  const minProfit = numberFromForm(formData.get('minProfit'))
  const minMarginPct = numberFromForm(formData.get('minMarginPct'))

  try {
    const result = await runArbitrageScan({
      query,
      limit: 50,
      config: {
        ...(offerPct != null ? { offerRatio: offerPct / 100 } : {}),
        ...(minProfit != null ? { minProfitUsd: minProfit } : {}),
        ...(minMarginPct != null ? { minMarginPct: minMarginPct / 100 } : {}),
      },
    })
    return { result }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Scan failed. Try again.',
    }
  }
}
