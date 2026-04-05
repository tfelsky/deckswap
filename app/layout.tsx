import type { Metadata } from 'next'
import { ActionFeedback } from '@/components/action-feedback'
import { AnalyticsConsentGate } from '@/components/analytics-consent'
import { Toaster } from '@/components/ui/sonner'
import { getSiteUrl } from '@/lib/site'
import './globals.css'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Mythiverse Exchange - Deck Trading, Pricing, And Trust For Paper Magic',
  description: 'Import decks, estimate value, compare inventory, and use Deck Swap for safer deck-for-deck trading.',
  alternates: {
    canonical: '/',
  },
  generator: 'v0.app',
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Mythiverse Exchange',
    title: 'Mythiverse Exchange - Deck Trading, Pricing, And Trust For Paper Magic',
    description:
      'Import decks, estimate value, compare inventory, and use Deck Swap for safer deck-for-deck trading.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mythiverse Exchange - Deck Trading, Pricing, And Trust For Paper Magic',
    description:
      'Import decks, estimate value, compare inventory, and use Deck Swap for safer deck-for-deck trading.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="skip-link sr-only fixed left-4 top-4 z-[100] rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground focus:not-sr-only focus:outline-none focus:ring-4 focus:ring-ring/60"
        >
          Skip to main content
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <ActionFeedback />
        <Toaster richColors position="top-right" />
        <AnalyticsConsentGate />
      </body>
    </html>
  )
}
