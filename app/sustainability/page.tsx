import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { ComplianceLinks } from '@/components/compliance-links'
import { Header } from '@/components/header'

const materialityTopics = [
  {
    title: 'Circularity and product life extension',
    body:
      'The marketplace model can help decks, sleeves, accessories, and related materials stay in use longer, reducing premature disposal and supporting reuse before replacement.',
  },
  {
    title: 'Packaging and shipping impacts',
    body:
      'Shipping materials, box selection, fill, and delivery patterns influence waste and emissions. Right-size packaging and reusable shipping kits are material issues for this business model.',
  },
  {
    title: 'Supplier ethics and human rights',
    body:
      'Suppliers, distributors, and imported goods can carry risks related to forced labour, child labour, and weak due diligence practices. These risks should be assessed as the business grows.',
  },
  {
    title: 'Digital operations and data practices',
    body:
      'Even a digital marketplace has environmental impact through hosting, platform usage, analytics, and operational tooling. Efficient defaults and reduced waste in digital operations still matter.',
  },
]

const wasteReductionActions = [
  'Promote reusable deck cases, shipping boxes, and protective materials where product safety is not compromised.',
  'Prefer right-size packaging guidance so shipments avoid unnecessary fill and oversized boxes.',
  'Encourage repair, reuse, resale, and careful reconditioning of deck-related materials before replacement.',
  'Reduce duplicate prints, unnecessary inserts, and disposable promotional material in shipping workflows.',
]

const sdgs = [
  {
    goal: 'SDG 12',
    title: 'Responsible Consumption and Production',
    body:
      'This is the clearest fit for a marketplace that encourages reuse, longer product life, and more thoughtful packaging and material handling.',
  },
  {
    goal: 'SDG 8',
    title: 'Decent Work and Economic Growth',
    body:
      'This connects to labour rights, responsible procurement, and the need to identify and address forced labour and child labour risks in supply chains.',
  },
  {
    goal: 'SDG 13',
    title: 'Climate Action',
    body:
      'Shipping, packaging, and digital operations all create climate-related impacts that should be managed through lower-waste, lower-impact operating choices where practical.',
  },
  {
    goal: 'SDG 17',
    title: 'Partnerships for the Goals',
    body:
      'Meaningful sustainability progress depends on collaboration with users, suppliers, logistics partners, and external training or advisory organizations.',
  },
]

export const metadata: Metadata = {
  title: 'Sustainability | Mythiverse Exchange',
  description:
    'Sustainability page for Mythiverse Exchange covering land acknowledgement, materiality, waste reduction, human rights in the supply chain, and relevant UN Sustainable Development Goals.',
}

export default function SustainabilityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-gradient-to-b from-background to-secondary/20 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              Sustainability
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Sustainability and responsible growth
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Mythiverse Exchange approaches sustainability as both an environmental and social
              responsibility. For this business, that means product life extension, lower-waste
              shipping, responsible procurement, and attention to human rights in the supply chain.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              This page is a public-facing sustainability statement for a pre-launch product. It
              should be refined over time with operational data, supplier due diligence processes,
              and formal legal or sustainability review where needed.
            </p>
            <ComplianceLinks current="/sustainability" />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Land acknowledgement</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Mythiverse Exchange recognizes that its work, users, and logistics networks operate
              across Indigenous lands and waters. We acknowledge the enduring presence,
              stewardship, laws, and knowledge systems of First Nations, Inuit, and Metis peoples.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Before launch, this statement should be localized to the actual place or places from
              which the organization operates, with the specific Nations and communities named
              accurately and respectfully rather than generically.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Materiality</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              The most material sustainability issues for this type of marketplace are the areas
              most likely to affect environmental impact, customer trust, and responsible business
              conduct:
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {materialityTopics.map((topic) => (
                <div
                  key={topic.title}
                  className="rounded-2xl border border-border bg-background/40 p-5"
                >
                  <h3 className="text-lg font-semibold text-foreground">{topic.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{topic.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-border bg-card p-8">
              <h2 className="text-2xl font-semibold text-foreground">Waste reduction</h2>
              <ul className="mt-5 space-y-3">
                {wasteReductionActions.map((action) => (
                  <li
                    key={action}
                    className="rounded-2xl border border-border bg-background/40 px-4 py-4 text-sm leading-7 text-muted-foreground"
                  >
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8">
              <h2 className="text-2xl font-semibold text-foreground">Responsible shipping</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Shipping is one of the clearest places where product protection, customer trust,
                emissions, and waste meet. The design goal is to use enough material to protect the
                shipment without normalizing excess packaging or single-use habits when reuse is
                realistic.
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Reusable deck cases, durable first-shipment boxes, and clear packing guidance can
                improve both sustainability and fulfillment quality when implemented carefully.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">
              Forced labour and child labour in the supply chain
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Mythiverse Exchange expects suppliers and partners to operate in a manner consistent
              with human rights, fair labour practices, and responsible sourcing. As the business
              grows, the organization should map supplier relationships, identify higher-risk goods
              and sourcing categories, and document due diligence steps used to prevent and reduce
              risks of forced labour and child labour.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              For Canadian operations, this work should be aligned with the requirements and risk
              management expectations associated with the Fighting Against Forced Labour and Child
              Labour in Supply Chains Act where applicable to the organization’s activities.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/40 p-5">
                <h3 className="text-lg font-semibold text-foreground">Practical controls</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Useful controls can include supplier onboarding questions, contractual standards,
                  documented escalation paths, targeted reviews of higher-risk categories, and
                  periodic training for team members involved in sourcing or procurement decisions.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/40 p-5">
                <h3 className="text-lg font-semibold text-foreground">Training support</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Internal awareness and compliance capability can be supported through training at
                  The Ecodemy, including its materials on Canada&apos;s forced labour and child labour
                  requirements and related sustainability topics.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">UN Sustainable Development Goals</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              The most relevant UN Sustainable Development Goals for this business are the goals
              tied to responsible production, labour rights, climate-related operating choices, and
              collaboration:
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sdgs.map((sdg) => (
                <div key={sdg.goal} className="rounded-2xl border border-border bg-background/40 p-5">
                  <div className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
                    {sdg.goal}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{sdg.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{sdg.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
