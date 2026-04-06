'use server'

import { redirect } from 'next/navigation'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/access'
import { createClient } from '@/lib/supabase/server'
import { normalizeSupportPriority, normalizeSupportStatus } from '@/lib/support'

export async function updateSupportTicketAction(formData: FormData) {
  const { supabase } = await requireAdmin()
  const adminSupabase = createAdminClientOrNull() ?? supabase ?? (await createClient())
  const ticketId = Number(formData.get('ticket_id'))

  if (!Number.isFinite(ticketId)) {
    redirect('/admin/support')
  }

  const status = normalizeSupportStatus(formData.get('status'))
  const priority = normalizeSupportPriority(formData.get('priority'))
  const adminNotes = String(formData.get('admin_notes') || '').trim()

  await adminSupabase
    .from('support_tickets')
    .update({
      status,
      priority,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
  redirect('/admin/support?updated=1')
}
