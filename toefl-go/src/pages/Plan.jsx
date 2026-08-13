import { phases } from '../data/schedule'
import { EXAM_DATE } from '../data/config'

export default function Plan() {
  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">學習計畫</h2>
        <p className="mt-1 text-sm text-ink-soft">
          目標考試日：{EXAM_DATE.toLocaleDateString('zh-TW')} · 依階段推進，不必一次做完全部
        </p>
      </section>

      <section className="space-y-3">
        {phases.map((phase, i) => (
          <article
            key={phase.id}
            className="surface soft-shadow animate-fade-up rounded-3xl p-5"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tide/10 font-display text-sm font-bold text-tide">
                {i + 1}
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-amber uppercase">
                  {phase.month}
                </p>
                <h3 className="font-display mt-1 text-xl font-bold text-ink">{phase.title}</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  {phase.goals.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="surface rounded-3xl p-5">
        <h3 className="font-display text-lg font-bold text-ink">每天最低標</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
          <li>單字 SRS 評分（想得出意思再按「記得」）</li>
          <li>閱讀或聽力擇一短練</li>
          <li>口說計時 1 題，或寫作打一段大綱</li>
        </ol>
      </section>
    </div>
  )
}
