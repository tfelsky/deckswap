'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/access'
import { sendUserTransactionalEmailById } from '@/lib/email-events'
import { createNotification } from '@/lib/notifications'
import { normalizePaperPowerNineStatus } from '@/lib/paper-power-nine'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function updatePaperPowerNineStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin()
  const adminSupabase = createAdminClientOrNull() ?? supabase ?? (await createClient())
  const submissionId = Number(formData.get('submission_id'))

  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    redirect('/admin/paper-power-9')
  }

  const nextStatus = normalizePaperPowerNineStatus(formData.get('status'))

  const { data: submission } = await adminSupabase
    .from('paper_power_nine_submissions')
    .select('id, user_id, credit_name, status')
    .eq('id', submissionId)
    .maybeSingle()

  if (!submission) {
    redirect('/admin/paper-power-9')
  }

  await adminSupabase
    .from('paper_power_nine_submissions')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (nextStatus === 'featured' && submission.status !== 'featured' && submission.user_id) {
    await createNotification(adminSupabase, {
      userId: submission.user_id,
      type: 'paper_power_nine_featured',
      title: 'Your Personal Power 9 was featured',
      body: 'Your submission was selected for the Paper Power 9 show. Check the campaign page for details.',
      href: '/paper-power-9',
      metadata: { submissionId },
    })

    try {
      await sendUserTransactionalEmailById({
        userId: submission.user_id,
        subject: 'Your Personal Power 9 was featured',
        body: 'Your submission was selected for the Paper Power 9 show. Open the campaign page to see your featured gallery.',
        href: '/paper-power-9',
        ctaLabel: 'View your Power 9',
        idempotencyKey: `pp9-featured:${submissionId}`,
        eyebrow: 'Paper Power 9',
      })
    } catch (error) {
      console.error('Failed to send Paper Power 9 featured email:', error)
    }
  }

  redirect(`/admin/paper-power-9?submission=${submissionId}&updated=1`)
}
