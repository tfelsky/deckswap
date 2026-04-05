'use server'

import {
  createPaperPowerNineSubmission,
  getPaperPowerNineSchemaHelpMessage,
  PERSONAL_POWER_NINE_CARD_COUNT,
  type PaperPowerNineCardInput,
} from '@/lib/paper-power-nine'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function buildReturnUrl(params?: Record<string, string | number>) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {})) {
    search.set(key, String(value))
  }

  const query = search.toString()
  return query ? `/paper-power-9?${query}` : '/paper-power-9'
}

function parseFinish(value: string): PaperPowerNineCardInput['finish'] {
  if (value === 'foil' || value === 'etched') return value
  return 'nonfoil'
}

function parseCards(formData: FormData): PaperPowerNineCardInput[] {
  return Array.from({ length: PERSONAL_POWER_NINE_CARD_COUNT }, (_, index) => {
    const slot = index + 1

    return {
      slot,
      name: String(formData.get(`card_${slot}_name`) || '').trim(),
      setCode: String(formData.get(`card_${slot}_set`) || '').trim(),
      collectorNumber: String(formData.get(`card_${slot}_collector`) || '').trim(),
      finish: parseFinish(String(formData.get(`card_${slot}_finish`) || 'nonfoil').trim()),
    }
  })
}

export async function submitPaperPowerNineAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const creditName = String(formData.get('credit_name') || '').trim()
  const contactEmail = String(formData.get('contact_email') || '').trim()
  const story = String(formData.get('story') || '').trim()
  const theme = String(formData.get('theme') || '').trim()

  if (!creditName) {
    redirect(buildReturnUrl({ error: 'Add the name you want us to use for your submission.' }))
  }

  if (!story) {
    redirect(buildReturnUrl({ error: 'Tell us why these nine cards matter to you.' }))
  }

  try {
    const result = await createPaperPowerNineSubmission(supabase, {
      userId: user.id,
      creditName,
      contactEmail: contactEmail || user.email || null,
      story,
      theme: theme || null,
      cards: parseCards(formData),
    })

    redirect(
      buildReturnUrl({
        submitted: result.submissionId,
        exactMatches: result.exactMatchCount,
      })
    )
  } catch (error) {
    const message =
      error instanceof Error
        ? getPaperPowerNineSchemaHelpMessage(error.message.slice(0, 240))
        : 'Personal Power 9 submission failed.'

    redirect(buildReturnUrl({ error: message }))
  }
}
