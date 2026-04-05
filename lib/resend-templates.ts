import { getEmailConfigSnapshot } from '@/lib/email'
import { getResendClient } from '@/lib/resend'

type TemplateDefinition = {
  alias: string
  name: string
  from: string
  subject: string
  html: string
  text: string
  variables?: Array<{
    key: string
    type: 'string' | 'number'
    fallbackValue?: string | number | null
  }>
}

function getTemplateDefinitions(): TemplateDefinition[] {
  const emailConfig = getEmailConfigSnapshot()

  return [
    {
      alias: 'deckswap-operational-alert',
      name: 'DeckSwap Operational Alert',
      from: emailConfig.transactionalFromEmail,
      subject: '{{{SUBJECT}}}',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #059669;">{{{EYEBROW}}}</p>
          <h1 style="margin: 12px 0 16px;">{{{SUBJECT}}}</h1>
          <p style="margin: 0 0 20px;">{{{BODY}}}</p>
          <p style="margin: 0;">
            <a href="{{{CTA_URL}}}">{{{CTA_LABEL}}}</a>
          </p>
        </div>
      `,
      text: '{{{EYEBROW}}}\n\n{{{SUBJECT}}}\n\n{{{BODY}}}\n\n{{{CTA_LABEL}}}: {{{CTA_URL}}}',
      variables: [
        { key: 'EYEBROW', type: 'string', fallbackValue: 'Account update' },
        { key: 'SUBJECT', type: 'string', fallbackValue: 'DeckSwap update' },
        { key: 'BODY', type: 'string', fallbackValue: 'There is a new update on your account.' },
        { key: 'CTA_LABEL', type: 'string', fallbackValue: 'Open DeckSwap' },
        { key: 'CTA_URL', type: 'string', fallbackValue: emailConfig.appBaseUrl },
      ],
    },
    {
      alias: 'deckswap-admin-signup-alert',
      name: 'DeckSwap Admin Signup Alert',
      from: emailConfig.transactionalFromEmail,
      subject: 'New signup: {{{EMAIL}}}',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #059669;">New user registered</p>
          <h1 style="margin: 12px 0 16px;">{{{EMAIL}}}</h1>
          <p style="margin: 0 0 12px;">User ID: {{{USER_ID}}}</p>
          <p style="margin: 0 0 20px;">Next deck they want to build: {{{NEXT_DECK_COMMANDER}}}</p>
          <p style="margin: 0;">
            <a href="{{{ADMIN_URL}}}">Open approvals</a>
          </p>
        </div>
      `,
      text: 'New user registered\n\nEmail: {{{EMAIL}}}\nUser ID: {{{USER_ID}}}\nNext deck they want to build: {{{NEXT_DECK_COMMANDER}}}\n\nOpen approvals: {{{ADMIN_URL}}}',
      variables: [
        { key: 'EMAIL', type: 'string', fallbackValue: 'user@example.com' },
        { key: 'USER_ID', type: 'string', fallbackValue: 'unknown-user-id' },
        { key: 'NEXT_DECK_COMMANDER', type: 'string', fallbackValue: 'Not provided' },
        { key: 'ADMIN_URL', type: 'string', fallbackValue: `${emailConfig.appBaseUrl}/admin/approvals` },
      ],
    },
    {
      alias: 'deckswap-marketing-broadcast',
      name: 'DeckSwap Marketing Broadcast',
      from: emailConfig.marketingFromEmail,
      subject: '{{{SUBJECT}}}',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #2563eb;">DeckSwap update</p>
          <h1 style="margin: 12px 0 16px;">{{{SUBJECT}}}</h1>
          <p style="margin: 0 0 20px;">{{{BODY}}}</p>
          <p style="margin: 0;">
            <a href="{{{CTA_URL}}}">{{{CTA_LABEL}}}</a>
          </p>
        </div>
      `,
      text: '{{{SUBJECT}}}\n\n{{{BODY}}}\n\n{{{CTA_LABEL}}}: {{{CTA_URL}}}',
      variables: [
        { key: 'SUBJECT', type: 'string', fallbackValue: 'DeckSwap update' },
        { key: 'BODY', type: 'string', fallbackValue: 'We shipped a new marketplace update.' },
        { key: 'CTA_LABEL', type: 'string', fallbackValue: 'Open DeckSwap' },
        { key: 'CTA_URL', type: 'string', fallbackValue: emailConfig.appBaseUrl },
      ],
    },
  ]
}

export async function syncResendTemplates() {
  const resend = getResendClient()
  const definitions = getTemplateDefinitions()
  const existing = await resend.templates.list({ limit: 100 })

  if (existing.error) {
    throw new Error(`Unable to list Resend templates: ${existing.error.message}`)
  }

  const templatesByAlias = new Map(
    (existing.data?.data ?? [])
      .filter((template) => template.alias)
      .map((template) => [template.alias as string, template.id])
  )

  const results: Array<{ alias: string; id: string; action: 'created' | 'updated' }> = []

  for (const definition of definitions) {
    const existingId = templatesByAlias.get(definition.alias)

    if (existingId) {
      const updateResult = await resend.templates.update(existingId, {
        name: definition.name,
        alias: definition.alias,
        from: definition.from,
        subject: definition.subject,
        html: definition.html,
        text: definition.text,
        variables: definition.variables as any,
      })

      if (updateResult.error || !updateResult.data) {
        throw new Error(
          `Unable to update Resend template ${definition.alias}: ${updateResult.error?.message ?? 'Unknown error'}`
        )
      }

      const publishResult = await resend.templates.publish(existingId)
      if (publishResult.error) {
        throw new Error(
          `Unable to publish Resend template ${definition.alias}: ${publishResult.error.message}`
        )
      }

      results.push({ alias: definition.alias, id: existingId, action: 'updated' })
      continue
    }

    const createResult = resend.templates.create({
      name: definition.name,
      alias: definition.alias,
      from: definition.from,
      subject: definition.subject,
      html: definition.html,
      text: definition.text,
      variables: definition.variables as any,
    })

    const created = await createResult
    if (created.error || !created.data) {
      throw new Error(
        `Unable to create Resend template ${definition.alias}: ${created.error?.message ?? 'Unknown error'}`
      )
    }

    const publishResult = await createResult.publish()
    if (publishResult.error) {
      throw new Error(
        `Unable to publish Resend template ${definition.alias}: ${publishResult.error.message}`
      )
    }

    results.push({ alias: definition.alias, id: created.data.id, action: 'created' })
  }

  return results
}
