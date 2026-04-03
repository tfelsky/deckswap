import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import Link from 'next/link'

const nineCardPrompt = Array.from({ length: 9 }, (_, index) => ({
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

export default function PaperPowerNinePage() {
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
              <div className="text-sm font-medium text-amber-200">Prototype submission form</div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
                Build a Paper Power 9 concept submission
              </h2>
              <p className="mt-3 text-sm leading-7 text-amber-50/85">
                This is a prototype page for now. It shows the intended intake shape and CTA, but
                it does not yet send data anywhere.
              </p>
            </div>

            <form className="mt-8 grid gap-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Your name</label>
                  <input
                    placeholder="How you want to be credited"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Email</label>
                  <input
                    placeholder="Optional contact for a future live version"
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-950/50 p-5">
                <div className="text-sm font-medium text-white">Your 9 favorite printings</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {nineCardPrompt.map((item) => (
                    <div key={item.slot}>
                      <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">
                        Card {item.slot}
                      </label>
                      <input
                        placeholder={item.placeholder}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-amber-300/40"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Why these nine?
                </label>
                <textarea
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
                <button
                  type="button"
                  className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Submit concept
                </button>
                <Link
                  href="/guest-import"
                  className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/15"
                >
                  Try guest deck import
                </Link>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
