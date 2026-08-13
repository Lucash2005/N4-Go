import { useEffect, useState } from 'react'
import { EXAM_DATE } from '../data/config'

function getLeft(target) {
  const diff = Math.max(0, target.getTime() - Date.now())
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  return { days, hours }
}

export default function Countdown() {
  const [left, setLeft] = useState(() => getLeft(EXAM_DATE))

  useEffect(() => {
    const id = setInterval(() => setLeft(getLeft(EXAM_DATE)), 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="surface soft-shadow animate-fade-up relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-amber/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 left-10 size-36 rounded-full bg-tide/15 blur-2xl" />
      <p className="relative text-xs font-semibold tracking-[0.18em] text-amber uppercase">
        Exam Countdown
      </p>
      <h2 className="font-display relative mt-1 text-2xl font-bold text-ink sm:text-3xl">
        距離目標考試
      </h2>
      <div className="relative mt-4 flex gap-4">
        <div>
          <div className="font-display text-3xl font-bold tabular-nums text-tide">{left.days}</div>
          <div className="text-xs text-ink-soft">天</div>
        </div>
        <div>
          <div className="font-display text-3xl font-bold tabular-nums text-tide">{left.hours}</div>
          <div className="text-xs text-ink-soft">小時</div>
        </div>
      </div>
      <p className="relative mt-3 text-xs text-ink-soft">
        預設目標日：{EXAM_DATE.toLocaleDateString('zh-TW')}（可在程式設定調整）
      </p>
    </section>
  )
}
