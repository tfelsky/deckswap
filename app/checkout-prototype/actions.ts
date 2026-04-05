'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  buildTradeDraftRows,
  isEscrowSchemaMissing,
} from '@/lib/escrow/foundation'
import type { SupportedCountry } from '@/lib/escrow/prototype'

function parseMoney(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(String(value ?? fallback))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parseCountry(value: FormDataEntryValue | null, fallback: SupportedCountry): SupportedCountry {
  const candidate = String(value ?? fallback).toLowerCase()
  return candidate === 'ca' || candidate === 'us' ? candidate : fallback
}

export async function createTradeDraftAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const input = {
    deckAValue: parseMoney(formData.get('deckAValue'), 1000),
    deckBValue: parseMoney(formData.get('deckBValue'), 1000),
    countryA: parseCountry(formData.get('countryA'), 'ca'),
    countryB: parseCountry(formData.get('countryB'), 'ca'),
  }

  const rows = buildTradeDraftRows(input, user.id)

  const transactionInsert = await supabase
    .from('trade_transactions')
    .insert(rows.transaction)
    .select('id')
    .single()

  if (transactionInsert.error || !transactionInsert.data) {
    if (isEscrowSchemaMissing(transactionInsert.error?.message)) {
      redirect('/checkout-prototype?schemaMissing=1')
    }

    redirect('/checkout-prototype?saveError=1')
  }

  const transactionId = transactionInsert.data.id

  const participantInsert = await supabase.from('trade_transaction_participants').insert(
    rows.participants.map((participant) => ({
      ...participant,
      transaction_id: transactionId,
    }))
  )

  if (participantInsert.error) {
    if (isEscrowSchemaMissing(participantInsert.error.message)) {
      redirect('/checkout-prototype?schemaMissing=1')
    }
    redirect('/checkout-prototype?saveError=1')
  }

  const eventInsert = await supabase.from('escrow_events').insert({
    ...rows.initialEvent,
    transaction_id: transactionId,
  })

  if (eventInsert.error) {
    if (isEscrowSchemaMissing(eventInsert.error.message)) {
      redirect('/checkout-prototype?schemaMissing=1')
    }
    redirect('/checkout-prototype?saveError=1')
  }

  redirect(`/trades/${transactionId}`)
}
