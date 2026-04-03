import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-secondary/50 py-20 sm:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-primary/20 bg-primary/10 p-6 text-left">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Value for Value
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Trade deck for deck, not hype for hype
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                DeckSwap is designed around value-for-value Commander matching. Bring a real inventory,
                match against another real inventory, and keep the exchange anchored to deck value with
                a small matching fee instead of opaque markups.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="text-sm text-muted-foreground">Why it matters</div>
              <div className="mt-4 space-y-3 text-sm text-foreground">
                <p>Blended pricing makes deck value easier to compare before you start a trade conversation.</p>
                <p>Bracket and inventory detail help players self-sort into more compatible trades.</p>
                <p>The matching fee stays small and visible so the trade itself stays centered on value.</p>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start with the real product flow
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sign in, import a Commander list, and turn it into a browsable marketplace entry
            with structured card data.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="h-12" asChild>
              <Link href="/sign-in">
                Sign In to Start
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12" asChild>
              <Link href="/create-deck">Create Manually</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Import if you have a full list. Create manually if you just want a quick listing.
          </p>
          </div>
        </div>
      </div>
    </section>
  )
}
