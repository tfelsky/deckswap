import { Resend } from 'resend'

let resendClient: Resend | null = null

export function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || ''
}

export function isResendConfigured() {
  return getResendApiKey().length > 0
}

export function getResendClient() {
  const apiKey = getResendApiKey()

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.')
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }

  return resendClient
}
