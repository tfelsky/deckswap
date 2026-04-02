import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-secondary/50 py-20 sm:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start Your Collection Today
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join DeckSwap for free and connect with the world&apos;s largest community of 
            playing card collectors.
          </p>

          <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-12 min-w-[300px] bg-background"
            />
            <Button size="lg" className="h-12">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required. Free forever for basic features.
          </p>
        </div>
      </div>
    </section>
  )
}
