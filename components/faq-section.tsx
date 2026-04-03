const faqs = [
  {
    question: "What is the DeckSwap value proposition?",
    answer:
      "DeckSwap is built around value-for-value Commander trading. You import a real deck, get a cleaner blended price estimate and bracket context, then match into trades that are close in value with a small platform matching fee layered on top instead of hidden spread.",
  },
  {
    question: "How does the matching fee work?",
    answer:
      "The current homepage framing is a small matching fee on top of a value-for-value trade. That means the deck value should stay centered on the imported card inventory, while the platform fee covers matching, coordination, and later operational protections rather than inflating the deck price itself.",
  },
  {
    question: "How would DeckSwap escrow work for decks?",
    answer:
      "The escrow model is that both sides agree on a matched deck value, DeckSwap collects the trade payment and fee, and the trade is only released once both decks are received and checked against the agreed inventory. In practice, escrow is the trust layer around the trade: it reduces the risk of one-sided shipment loss, gives the platform a clear hold-and-release moment, and works alongside shipping and insurance rather than replacing them.",
  },
  {
    question: "What is the best way to import a deck?",
    answer:
      "Best practice is to import a full decklist from pasted text, a `.txt` upload, an Archidekt export, or a public Moxfield URL. Full imports let the app validate commander structure, preserve tokens, and enrich pricing and print metadata much more reliably than manual entry.",
  },
  {
    question: "What should I do if the commander is not detected?",
    answer:
      "If a source list does not explicitly label the commander, import the deck anyway and then set the commander from the deck page. That keeps the imported card inventory intact while letting validation recalculate once the commander is chosen.",
  },
  {
    question: "How should I interpret the price on a deck page?",
    answer:
      "The current estimate is a blended card total based on each card's foil flag when pricing is available. It is best used as a marketplace guidance number, not a final settlement amount, because actual trade decisions still depend on condition, shipping, and the cards that could not be priced.",
  },
  {
    question: "When should I re-enrich a deck?",
    answer:
      "Re-enrichment is helpful after parser improvements, pricing fixes, or schema additions. If a deck is missing prices, card stats, or richer print data, rerunning enrichment refreshes the inventory without needing the user to re-import from scratch.",
  },
  {
    question: "What are the best practices for deck listings?",
    answer:
      "Use a complete list, keep the commander correct, preserve token inventory where possible, and prefer imports over quick manual listings for serious trading. More complete inventory gives better bracket estimation, cleaner deck pages, and fewer surprises during matching.",
  },
  {
    question: "What are the best practices for safer trades?",
    answer:
      "Trade partners should compare the full deck page, check bracket expectations, confirm the blended value is in the right range, and agree on shipping method before finalizing. As the roadmap expands, shipping, insurance, verification, and reputation will make this workflow stronger.",
  },
]

export function FAQSection() {
  return (
    <section className="bg-secondary/30 py-20 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
            FAQ
          </div>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Best practices for importing, pricing, and matching
          </h2>
          <p className="mt-4 text-muted-foreground">
            A short operating guide for using DeckSwap the way the product is meant to work.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">
                {faq.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
