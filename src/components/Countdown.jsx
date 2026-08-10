import { useEffect, useState } from 'react'
import { EXAM_DATE } from '../data/config'
import { getCountdown, pad2 } from '../utils/countdown'

export default function Countdown() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { days, hours, minutes, seconds } = getCountdown(EXAM_DATE, now)

  const units = [
    { label: '天', value: days },
    { label: '時', value: pad2(hours) },
    { label: '分', value: pad2(minutes) },
    { label: '秒', value: pad2(seconds) },
  ]

  return (
    <section className="surface soft-shadow wave-mask animate-fade-up relative overflow-hidden rounded-3xl p-5 sm:p-7">
      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-coral/15 blur-2xl" />
      <div className="absolute -bottom-12 left-10 h-28 w-28 rounded-full bg-sea/20 blur-2xl" />

      <p className="relative text-sm font-medium text-sea-deep">距離 2026 年 12 月日檢</p>
      <h2 className="font-display relative mt-1 text-2xl font-bold text-ink sm:text-3xl">
        倒數計時
      </h2>
      <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        考試日設定為 2026/12/06（日本時間）。每天一點累積，比臨時衝刺更穩。
      </p>

      <div className="relative mt-5 grid grid-cols-4 gap-2 sm:gap-3">
        {units.map((u, i) => (
          <div
            key={u.label}
            className={`animate-fade-up stagger-${i + 1} rounded-2xl bg-white/80 px-2 py-3 text-center ring-1 ring-line/60`}
          >
            <div className="font-display text-2xl font-bold tabular-nums text-ink sm:text-3xl">
              {u.value}
            </div>
            <div className="mt-1 text-xs text-ink-soft">{u.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
