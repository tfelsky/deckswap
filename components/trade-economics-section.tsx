import { ArrowRightLeft, ShieldCheck, TrendingUp } from "lucide-react"
import { AdminOnlyCallout } from "@/components/admin-only-callout"
import { calculateGuaranteedBuyNowOffer } from "@/lib/decks/trade-value"
import { getAdminAccessForUser } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

const optimalProfilePoints = [
  "Domestic lane: same-country trades are the cleanest first-class experience for trust, shipping, and support.",
  "Close in value: the best trades are roughly matched, or need only light equalization instead of a large cash top-up.",
  "Mid-to-premium decks: once a deck is above roughly $300, shipping and insurance become a much smaller percentage of the total value.",
]

const exampleRows = [
  {
    title: "$1,000 for $1,000",
    summary: "Premium matched trade",
    dueNow: "$122 each",
    preserved: "$878 of deck value each",
    extraVsBuylist: "$378 more than a 50% buylist exit",
  },
  {
    title: "$500 for $300",
    summary: "Downtrade with equalization",
    dueNow: "$82 on the $500 side, $253 on the $300 side",
    preserved: "$418 and $247 of net trade value",
    extraVsBuylist: "$168 and $121 above typical buylist value",
  },
  {
    title: "$100 for $100",
    summary: "Low-value warning case",
    dueNow: "$28 each",
    preserved: "$72 of deck value each",
    extraVsBuylist: "$37 above buylist, but costs are much heavier as a percentage",
  },
]

const guaranteedExamples = [1000, 500, 300].map((value) => {
  const model = calculateGuaranteedBuyNowOffer(value)

  return {
    value,
    guaranteed: model.guaranteedOffer,
  }
})

export async function TradeEconomicsSection() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = await getAdminAccessForUser(user)

  return (
    <section className="py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="deckswap-glass rounded-[2rem] p-8">
            <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
              Optimal Deck Profile
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
              The strongest DeckSwap listing is not a random pile of cards
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              The economics get better when the deck is complete, easy to verify, and strong enough in value that shipping and insurance stay small relative to what is being protected.
            </p>

            <div className="mt-8 space-y-3">
              {optimalProfilePoints.map((point, index) => (
                <div key={point} className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      {index === 0 ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : index === 1 ? (
                        <ArrowRightLeft className="h-5 w-5" />
                      ) : (
                        <TrendingUp className="h-5 w-5" />
                      )}
                    </div>
                    <p className="text-sm leading-7 text-foreground/90">{point}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-5">
              <div className="text-sm font-medium text-foreground">Best overall fit</div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                A domestic trade between complete decks in the roughly <span className="font-semibold text-foreground">$300 to $1,000+</span> range is where the model feels most compelling. The parcel is still manageable, the support workflow stays cleaner, and the value preserved versus buylist becomes materially easier to feel.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur-sm">
            <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
              Savings Economics
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
              What the three examples actually prove
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              The trade works best when we preserve deck value instead of collapsing everything down to buylist cash. Higher-value, same-lane trades absorb logistics far better than low-value ones.
            </p>

            <div className="mt-8 grid gap-4">
              {exampleRows.map((row) => (
                <div key={row.title} className="rounded-[1.5rem] border border-border bg-background/40 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{row.title}</div>
                      <div className="text-sm text-primary/80">{row.summary}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Example
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/80 bg-card/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Due now</div>
                      <div className="mt-2 text-sm font-medium text-foreground">{row.dueNow}</div>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-card/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Net kept</div>
                      <div className="mt-2 text-sm font-medium text-foreground">{row.preserved}</div>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-card/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Vs buylist</div>
                      <div className="mt-2 text-sm font-medium text-foreground">{row.extraVsBuylist}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {access.isAdmin ? (
              <AdminOnlyCallout
                className="mt-8"
                title="Guaranteed Offer model"
                description="Visible to admins only. This pricing model is hidden from non-admin users."
              >
                <p className="text-sm leading-7 text-muted-foreground">
                  For sellers who want certainty, admins can quote a <span className="font-semibold text-foreground">Guaranteed Offer</span> for a direct DeckSwap purchase. This lane stays internal and separate from public Buy It Now pricing.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {guaranteedExamples.map((example) => (
                    <div key={example.value} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">${example.value} deck</div>
                      <div className="mt-2 text-lg font-semibold text-amber-200">Guaranteed Offer ${example.guaranteed.toFixed(2)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Internal admin quote for an immediate DeckSwap purchase.</div>
                    </div>
                  ))}
                </div>
              </AdminOnlyCallout>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/checkout-prototype"
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Explore the economics
              </Link>
              <Link
                href="/import-deck"
                className="rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                List a better-fit deck
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
