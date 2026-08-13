export default function ProgressBar({ label, value, target, hint }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100))
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs tabular-nums text-ink-soft">
          {value}/{target}
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full bg-tide transition-all" style={{ width: `${pct}%` }} />
      </div>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  )
}
