export function StarRating({ average }: { average: number }) {
  return (
    <span aria-hidden className="text-base leading-none tracking-tight">
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, average - index))
        return (
          <span key={index} className="relative inline-block">
            <span className="text-zinc-700">★</span>
            <span
              className="absolute inset-0 overflow-hidden text-amber-300"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </span>
        )
      })}
    </span>
  )
}
