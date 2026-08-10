export default function ProgressBar({ label, value, target, hint }) {
  const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100))

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-sea-deep">{value}</span> / {target}
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-foam">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sea to-sea-deep transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? <p className="mt-1.5 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  )
}
