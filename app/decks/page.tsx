import { createClient } from '@/lib/supabase/server'

export default async function DecksPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('id')

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-500">Error</h1>
        <pre>{error.message}</pre>
      </div>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Decks</h1>

      <ul className="space-y-3">
        {data?.map((deck) => (
          <li key={deck.id} className="border rounded p-3">
            {deck.name}
          </li>
        ))}
      </ul>
    </main>
  )
}