'use server'

import { redirect } from 'next/navigation'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  isSupportSchemaMissing,
  normalizeSupportCategory,
  normalizeSupportPriority,
} from '@/lib/support'

function toSupportQuery(params: Record<string, string>) {
  const search = new URLSearchParams(params)
  return `/support?${search.toString()}`
}

export async function submitSupportTicketAction(formData: FormData) {
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = String(formData.get('email') || user?.email || '').trim()
  const name = String(formData.get('name') || '').trim()
  const subject = String(formData.get('subject') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const urlPath = String(formData.get('url_path') || '').trim()
  const category = normalizeSupportCategory(formData.get('category'))
  const priority = normalizeSupportPriority(formData.get('priority'))

  if (!email || !subject || !description) {
    redirect(
      toSupportQuery({
        error: 'missing_fields',
      })
    )
  }

  const { error } = await adminSupabase.from('support_tickets').insert({
    user_id: user?.id ?? null,
    email,
    name: name || null,
    subject,
    category,
    priority,
    status: 'open',
    description,
    url_path: urlPath || null,
  })

  if (error) {
    redirect(
      toSupportQuery({
        error: isSupportSchemaMissing(error.message) ? 'support_not_ready' : 'submit_failed',
      })
    )
  }

  redirect(
    toSupportQuery({
      submitted: '1',
    })
  )
}
