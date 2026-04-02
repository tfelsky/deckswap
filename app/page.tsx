import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturedDecks } from "@/components/featured-decks"
import { TradeMatching } from "@/components/trade-matching"
import { HowItWorks } from "@/components/how-it-works"
import { Categories } from "@/components/categories"
import { Testimonials } from "@/components/testimonials"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturedDecks />
        <TradeMatching />
        <HowItWorks />
        <Categories />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
