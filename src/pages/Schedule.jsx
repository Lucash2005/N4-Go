import { monthlyMilestones, schedulePhases } from '../data/schedule'

const colorMap = {
  sea: 'from-sea/20 to-sea-soft',
  coral: 'from-coral/20 to-[#f8e6df]',
  sand: 'from-sand to-[#f3ebe2]',
  'sea-deep': 'from-sea-deep/20 to-foam',
}

export default function Schedule() {
  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">學習計畫總覽</h2>
        <p className="mt-1 text-sm text-ink-soft">
          從現在到 12 月：基礎文法打底 → 單字累積 → 題庫刷題 → 模擬試題衝刺
        </p>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold text-ink">月分里程碑</h3>
        <ol className="mt-4 space-y-3">
          {monthlyMilestones.map((m, i) => (
            <li
              key={m.month}
              className="animate-fade-up flex gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-line/50"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sea/10 font-display text-sm font-bold text-sea-deep">
                {m.label}
              </div>
              <div>
                <p className="font-medium text-ink">{m.target}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{m.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="space-y-4">
        {schedulePhases.map((phase, idx) => (
          <section
            key={phase.id}
            className={`soft-shadow animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br ${colorMap[phase.color]} ring-1 ring-line/40`}
            style={{ animationDelay: `${0.08 * (idx + 1)}s` }}
          >
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wider text-sea-deep">
                    PHASE {idx + 1} · {phase.period}
                  </p>
                  <h3 className="font-display mt-1 text-xl font-bold text-ink">{phase.title}</h3>
                </div>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink-soft">
                  {phase.monthRange}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{phase.goal}</p>

              <div className="mt-4 space-y-3">
                {phase.weeks.map((week) => (
                  <div key={week.label} className="rounded-2xl bg-white/75 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-ink">{week.label}</p>
                      <p className="text-xs text-sea-deep">{week.focus}</p>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {week.tasks.map((task) => (
                        <li key={task} className="flex gap-2 text-sm text-ink-soft">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sea" />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
