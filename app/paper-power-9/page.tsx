import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { PersonalPowerNineGallery } from '@/components/personal-power-nine-gallery'
import FormActionButton from '@/components/form-action-button'
import {
  isPaperPowerNineSchemaMissing,
  PERSONAL_POWER_NINE_CARD_COUNT,
} from '@/lib/paper-power-nine'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { submitPaperPowerNineAction } from './actions'

const nineCardPrompt = Array.from({ length: PERSONAL_POWER_NINE_CARD_COUNT }, (_, index) => ({
  slot: index + 1,
  placeholder: `Favorite printing #${index + 1}`,
}))

const reviewSignals = [
  'How personal and memorable the printing choices feel',
  'Visual cohesion across all nine cards',
  'Interesting stories, nostalgia, or collector perspective',
  'How well the submission would translate into a strong YouTube segment',
]

const monthlyPrizeNotes = [
  'One standout submission is selected each month.',
  'Winning entry receives 10 packs of the latest Standard-legal set available at prize fulfillment time.',
  'DeckSwap covers standard domestic shipping for the prize.',
  'Prize fulfillment, judging criteria, and final eligibility rules still need formal ops support before launch.',
]

const episodeIdeas = [
  'Best old-border nine-card lineup',
  'Most nostalgic draft-era favorites',
  'Favorite foil spread with a real story behind it',
  'Commander staples with the coolest personal printing mix',
]

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function getSingleParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export default async function PaperPowerNinePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const submittedId = getSingleParam(resolvedSearchParams, 'submitted')
  const exactMatches = getSingleParam(resolvedSearchParams, 'exactMatches')
  const errorMessage = getSingleParam(resolvedSearchParams, 'error')
  const activeSubmissionId = submittedId ? Number(submittedId) : null

  let latestSubmissionCards: Array<{
    id: number
    slot_number: number
    submitted_name: string
    requested_finish: string
    card_name?: string | null
    set_name?: string | null
    set_code?: string | null
    collector_number?: string | null
    image_url?: string | null
    rarity?: string | null
    type_line?: string | null
    artist_name?: string | null
    artist_summary?: string | null
    artist_notable_cards?: string[] | null
    top_eight_points?: string[] | null
    color_identity?: string[] | null
    exact_print_matched?: boolean | null
  }> = []

  if (user) {
    try {
      const submissionQuery = supabase
        .from('paper_power_nine_submissions')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const submissionResult = activeSubmissionId
        ? await supabase
            .from('paper_power_nine_submissions')
            .select('id')
            .eq('user_id', user.id)
            .eq('id', activeSubmissionId)
            .maybeSingle()
        : await submissionQuery.maybeSingle()

      if (submissionResult.error && !isPaperPowerNineSchemaMissing(submissionResult.error.message)) {
        throw new Error(submissionResult.error.message)
      }

      const latestSubmissionId = Number(submissionResult.data?.id ?? 0)

      if (latestSubmissionId > 0) {
        const cardsResult = await supabase
          .from('paper_power_nine_submission_cards')
          .select(
            'id, slot_number, submitted_name, requested_finish, card_name, set_name, set_code, collector_number, image_url, rarity, type_line, artist_name, artist_summary, artist_notable_cards, top_eight_points, color_identity, exact_print_matched'
          )
          .eq('submission_id', latestSubmissionId)
          .eq('user_id', user.id)
          .order('slot_number', { ascending: true })

        if (cardsResult.error && !isPaperPowerNineSchemaMissing(cardsResult.error.message)) {
          throw new Error(cardsResult.error.message)
        }

        if (!cardsResult.error) {
          latestSubmissionCards = (cardsResult.data ?? []) as typeof latestSubmissionCards
        }
      }
    } catch (error) {
      console.error('Failed to load Personal Power 9 gallery:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(255,214,122,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.16),transparent_30%),linear-gradient(180deg,#111827_0%,#09090b_100%)] py-24 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-amber-200">
                  YouTube Concept
                </div>
                <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Paper Power 9: submit your nine favorite printings for YouTube review
                </h1>
                <p className="mt-5 max-w-3xl text-lg text-zinc-200/85">
                  This concept turns collector taste into a monthly show format. Users submit a
                  personal list of nine favorite paper printings, DeckSwap reviews standout entries
                  on YouTube, and one submission each month wins 10 packs from the latest
                  Standard-legal release plus shipping.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#submission-form"
                    className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                  >
                    Build a submission
                  </a>
                  <Link
                    href="/info"
                    className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/15"
                  >
                    Back to info
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/25 p-6 backdrop-blur">
                <div className="text-sm font-medium text-amber-200">Show framing</div>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">Format</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      Nine favorite printings, one story-driven collector segment
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">Hook</div>
                    <div className="mt-2 text-sm text-zinc-200/85">
                      The list is not about raw price or rarity. It is about the personal paper
                      versions players love most.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">Prize</div>
                    <div className="mt-2 text-sm text-zinc-200/85">
                      Top submission of the month wins 10 packs of the latest Standard-legal set at
                      fulfillment time, with shipping included.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Step 1
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Pick your nine</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Choose the nine paper printings that best represent your taste, nostalgia, deck
                identity, or collector story.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Step 2
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Add your story</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The strongest submissions explain why these printings matter, not just what they
                are. Personality is the point.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Step 3
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Get featured</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap reviews standout monthly submissions on YouTube and highlights the one
                that feels most compelling on camera.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                What We Look For
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                Strong submissions should feel personal, visual, and talkable
              </h2>
              <div className="mt-6 space-y-3">
                {reviewSignals.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Prize Notes
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                Monthly winner prize and prototype boundaries
              </h2>
              <div className="mt-6 space-y-3">
                {monthlyPrizeNotes.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="submission-form" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-8">
            <div className="max-w-3xl">
              <div className="text-sm font-medium text-amber-200">Live submission intake</div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
                Build a Personal Power 9 submission
              </h2>
              <p className="mt-3 text-sm leading-7 text-amber-50/85">
                Submit nine exact printings with set, collector number, and finish. DeckSwap saves
                the submission to your account and enriches each card with Scryfall data the same
                way deck imports do.
              </p>
            </div>

            {submittedId ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Submission #{submittedId} was saved to your account. {exactMatches || '0'} of the 9
                cards matched the exact print you entered.
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {errorMessage}
              </div>
            ) : null}

            {!user ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 px-5 py-4 text-sm text-zinc-200">
                Sign in first to attach a Personal Power 9 submission to your account.
                <div className="mt-3">
                  <Link
                    href="/sign-in"
                    className="rounded-2xl bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
                  >
                    Sign in to submit
                  </Link>
                </div>
              </div>
            ) : (
              <form action={submitPaperPowerNineAction} className="mt-8 grid gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Your name</label>
                    <input
                      name="credit_name"
                      defaultValue={user.user_metadata?.display_name ?? ''}
                      placeholder="How you want to be credited"
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Contact email</label>
                    <input
                      type="email"
                      name="contact_email"
                      defaultValue={user.email ?? ''}
                      placeholder="Optional follow-up email"
                      className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-950/50 p-5">
                  <div className="text-sm font-medium text-white">Your 9 favorite printings</div>
                  <p className="mt-2 text-sm text-zinc-300">
                    Enter the exact paper printing you want reviewed. Set code and collector number
                    are used for Scryfall enrichment and exact-print matching.
                  </p>
                  <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    {nineCardPrompt.map((item) => (
                      <div key={item.slot} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                        <label className="mb-3 block text-xs uppercase tracking-wide text-zinc-400">
                          Card {item.slot}
                        </label>
                        <div className="grid gap-3">
                          <input
                            name={`card_${item.slot}_name`}
                            placeholder={item.placeholder}
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                          />
                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                            <input
                              name={`card_${item.slot}_set`}
                              placeholder="Set code"
                              className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white uppercase outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                            />
                            <input
                              name={`card_${item.slot}_collector`}
                              placeholder="Collector #"
                              className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                            />
                          </div>
                          <select
                            name={`card_${item.slot}_finish`}
                            defaultValue="nonfoil"
                            style={{ colorScheme: 'dark' }}
                            className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-amber-300/40"
                          >
                            <option value="nonfoil" className="bg-zinc-900 text-white">
                              Non-foil
                            </option>
                            <option value="foil" className="bg-zinc-900 text-white">
                              Foil
                            </option>
                            <option value="etched" className="bg-zinc-900 text-white">
                              Etched foil
                            </option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Why these nine?
                  </label>
                  <textarea
                    name="story"
                    rows={8}
                    placeholder="Tell the story behind your picks. Nostalgia, art, old-border love, the copy you opened as a kid, the version you finally tracked down, or the printings that define your taste."
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Episode angle or theme
                  </label>
                  <select
                    name="theme"
                    style={{ colorScheme: 'dark' }}
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-amber-300/40"
                  >
                    <option value="" className="bg-zinc-900 text-white">
                      Pick a theme (optional)
                    </option>
                    {episodeIdeas.map((idea) => (
                      <option key={idea} value={idea} className="bg-zinc-900 text-white">
                        {idea}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-3">
                  <FormActionButton
                    pendingLabel="Saving submission..."
                    className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Submit Personal Power 9
                  </FormActionButton>
                  <Link
                    href="/guest-import"
                    className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/15"
                  >
                    Try guest deck import
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>

        {user && latestSubmissionCards.length > 0 ? (
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
            <PersonalPowerNineGallery cards={latestSubmissionCards} />
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  )
}
