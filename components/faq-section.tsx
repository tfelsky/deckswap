const faqs = [
  {
    question: "What is Mythiverse Exchange built for?",
    answer:
      "Mythiverse Exchange is built for players who want a better way to move complete decks. Instead of breaking everything down into singles first, you can present a real list, compare value more clearly, and choose the path that fits best: trade, sale, or auction.",
  },
  {
    question: "Why use deck-for-deck matching instead of a buylist?",
    answer:
      "For many players, a close deck-to-deck match preserves more value than a traditional trade-in. The goal is to keep the conversation centered on the deck itself instead of losing a large percentage to spread before the trade even begins.",
  },
  {
    question: "How does escrow help higher-value trades?",
    answer:
      "Escrow is there to make valuable trades feel safer. It adds structure around the handoff, helps both sides stay aligned on what is being exchanged, and gives higher-value deals a clearer path forward when trust and delivery matter most.",
  },
  {
    question: "What is the best way to add a deck?",
    answer:
      "A full import is usually the best start. The more complete the list, the easier it is to build a stronger deck page with clearer pricing, a cleaner commander setup, and better context for buyers or trade partners.",
  },
  {
    question: "What should I do if the commander is not detected?",
    answer:
      "If the commander is not detected right away, you can still keep the deck and set it from the deck page. That is usually the quickest way to clean up a list without starting over.",
  },
  {
    question: "How should I interpret the price on a deck page?",
    answer:
      "Think of the deck price as a strong marketplace reference point, not a final verdict. It helps anchor conversations, but the real outcome still depends on condition, presentation, and what both sides want from the exchange.",
  },
  {
    question: "How can I make a deck page stronger?",
    answer:
      "Use a complete list, keep the commander accurate, include token support when relevant, and add packaging and condition details when you can. Better context makes the page more useful for both buyers and trade partners.",
  },
  {
    question: "What makes for a safer trade or sale?",
    answer:
      "Clear inventory, honest condition notes, realistic value expectations, and good communication all make a difference. The better a deck is represented up front, the fewer surprises there are later.",
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
            Common questions from players moving real decks
          </h2>
          <p className="mt-4 text-muted-foreground">
            A quick guide to what Mythiverse Exchange is for and how to get the most out of it.
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
