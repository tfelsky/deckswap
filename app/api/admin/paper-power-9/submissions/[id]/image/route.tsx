import { requireAdmin } from '@/lib/admin/access'
import { loadAdminPaperPowerNineSubmissionDetail } from '@/lib/admin/paper-power-nine'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

function formatFinish(value?: string | null) {
  switch ((value || '').trim().toLowerCase()) {
    case 'foil':
      return 'Foil'
    case 'etched':
      return 'Etched Foil'
    default:
      return 'Non-foil'
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()

  const resolvedParams = await params
  const submissionId = Number(resolvedParams.id || 0)

  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    return new Response('Invalid submission id.', { status: 400 })
  }

  const result = await loadAdminPaperPowerNineSubmissionDetail(submissionId)

  if (result.schemaMissing) {
    return new Response('Personal Power 9 schema is not available.', { status: 503 })
  }

  if (!result.detail) {
    return new Response('Submission not found.', { status: 404 })
  }

  const cards = [...result.detail.cards].sort((left, right) => left.slot_number - right.slot_number)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(circle at top left, rgba(251,191,36,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(56,189,248,0.16), transparent 32%), linear-gradient(180deg, #111827 0%, #09090b 100%)',
          color: 'white',
          padding: '44px',
          fontFamily: 'Arial',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '780px' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#fde68a',
                marginBottom: 12,
              }}
            >
              Mythivex Personal Power 9
            </div>
            <div style={{ display: 'flex', fontSize: 46, fontWeight: 700, lineHeight: 1.1 }}>
              {result.detail.submission.credit_name}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#d4d4d8', marginTop: 12 }}>
              {result.detail.submission.theme || 'Curated printing showcase'}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              fontSize: 18,
              color: '#d4d4d8',
            }}
          >
            <div style={{ display: 'flex' }}>Submission #{result.detail.submission.id}</div>
            <div style={{ display: 'flex', marginTop: 8 }}>
              {result.detail.submission.exact_match_count ?? 0}/9 exact print matches
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '22px',
            flex: 1,
          }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 28,
                background: 'rgba(10, 10, 12, 0.72)',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.28)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 292,
                  background: 'linear-gradient(180deg, rgba(24,24,27,0.9), rgba(9,9,11,0.98))',
                  padding: 18,
                }}
              >
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.card_name || card.submitted_name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '256px',
                      objectFit: 'contain',
                      borderRadius: 20,
                      boxShadow: '0 18px 36px rgba(0,0,0,0.32)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '256px',
                      borderRadius: 20,
                      background: 'rgba(255,255,255,0.04)',
                      color: '#a1a1aa',
                      fontSize: 20,
                    }}
                  >
                    Image unavailable
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', padding: '18px 20px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '78%' }}>
                    <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>
                      {card.card_name || card.submitted_name}
                    </div>
                    <div style={{ display: 'flex', fontSize: 16, color: '#d4d4d8', marginTop: 8 }}>
                      {card.set_name || card.submitted_set_code.toUpperCase()} •{' '}
                      {card.collector_number || card.submitted_collector_number}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignSelf: 'flex-start',
                      fontSize: 15,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: 'rgba(251,191,36,0.16)',
                      color: '#fef3c7',
                    }}
                  >
                    {formatFinish(card.requested_finish)}
                  </div>
                </div>

                <div style={{ display: 'flex', fontSize: 15, color: '#a1a1aa', marginTop: 12 }}>
                  {card.rarity || 'Unknown rarity'} • {card.type_line || 'Type unavailable'}
                </div>
                <div style={{ display: 'flex', fontSize: 15, color: '#a1a1aa', marginTop: 8 }}>
                  Artist: {card.artist_name || 'Unknown'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1600,
      height: 1800,
      headers: {
        'Content-Disposition': `attachment; filename="personal-power-9-${submissionId}.png"`,
      },
    }
  )
}
