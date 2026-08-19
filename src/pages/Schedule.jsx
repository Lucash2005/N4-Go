import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { monthlyMilestones, schedulePhases } from '../data/schedule'
import { GRAMMAR_MONTH_PATH } from '../data/grammarPath'
import { useProgress } from '../hooks/useProgress'
import { getPlanProgress } from '../utils/planProgress'

const colorMap = {
  sea: 'from-sea/20 to-sea-soft',
  coral: 'from-coral/20 to-[#f8e6df]',
  sand: 'from-sand to-[#f3ebe2]',
  'sea-deep': 'from-sea-deep/20 to-foam',
}

export default function Schedule() {
  const {
    learnedVocab,
    learnedGrammar,
    quizStats,
    totalVocabInApp,
    totalGrammarInApp,
  } = useProgress()

  const quizRate =
    quizStats.attempted > 0
      ? Math.round((quizStats.correct / quizStats.attempted) * 100)
      : null

  const plan = getPlanProgress({
    learnedVocab,
    learnedGrammar,
    quizRate,
    appVocab: totalVocabInApp,
    appGrammar: totalGrammarInApp,
  })

  const statusLabel =
    plan.severity === 'ok' ? '進度正常' : plan.severity === 'mid' ? '略為落後' : '明顯落後'

  const statusClass =
    plan.severity === 'ok'
      ? 'bg-sea/15 text-sea-deep'
      : plan.severity === 'mid'
        ? 'bg-sand text-ink'
        : 'bg-coral/15 text-coral'

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-ink">學習計畫總覽</h2>
        <p className="mt-1 text-sm text-ink-soft">
          文法按月解鎖（先補上個月，再開本月新句型）；單字量目標不變
        </p>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">計畫進度對照</h3>
            <p className="mt-1 text-sm text-ink-soft">
              本月重點：{plan.currentMilestone?.label} · {plan.currentMilestone?.target}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <GapRow
            label="單字"
            actual={plan.actual.vocab}
            expected={plan.expected.vocab}
            finalTarget={1500}
            appCap={plan.caps.vocab}
            behind={plan.behind.vocab}
          />
          <GapRow
            label="文法"
            actual={plan.actual.grammar}
            expected={plan.expected.grammar}
            finalTarget={80}
            appCap={plan.caps.grammar}
            behind={plan.behind.grammar}
          />
          <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-line/50">
            <div className="flex items-end justify-between gap-2">
              <p className="text-sm font-medium text-ink">測驗累計正確率</p>
              <p className="text-xs text-ink-soft">
                {plan.actual.quizRate == null
                  ? '尚未測驗'
                  : `${plan.actual.quizRate}%${
                      plan.expected.quizRate != null ? `／目標約 ${plan.expected.quizRate}%` : ''
                    }`}
              </p>
            </div>
            {plan.behind.quiz ? (
              <p className="mt-2 text-xs text-coral">正確率偏低，建議本週多做 2～3 回測驗。</p>
            ) : (
              <p className="mt-2 text-xs text-ink-soft">距離考試還有 {plan.daysToExam} 天</p>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-ink-soft">
          說明：計畫目標是完整 N4 路線（單字 1500／文法 80）。App 目前收錄{' '}
          {totalVocabInApp} 字／{totalGrammarInApp} 條，學完 App 內內容後可持續擴充題庫。
        </p>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-2 rounded-3xl p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold text-ink">
          {plan.severity === 'ok' ? '建議維持' : '補救措施'}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          {plan.severity === 'ok'
            ? '照今日排程走即可'
            : '先補落後科目，再恢復一般節奏'}
        </p>
        <ul className="mt-4 space-y-3">
          {plan.remedies.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{item.detail}</p>
                </div>
                <Link
                  to={item.to}
                  className="rounded-xl bg-sea px-3 py-2 text-sm text-white hover:bg-sea-deep"
                >
                  {item.cta}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-2 rounded-3xl p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold text-ink">月分里程碑</h3>
        <ol className="mt-4 space-y-3">
          {monthlyMilestones.map((m, i) => {
            const isCurrent = m.month === plan.currentKey
            const reachedVocab = learnedVocab >= m.vocabTarget
            const reachedGrammar = learnedGrammar >= m.grammarTarget
            const done = reachedVocab && reachedGrammar
            const path = GRAMMAR_MONTH_PATH.find((p) => p.month === m.month)
            return (
              <li
                key={m.month}
                className={`animate-fade-up flex gap-3 rounded-2xl p-3 ring-1 ${
                  isCurrent ? 'bg-sea/10 ring-sea/30' : 'bg-white/70 ring-line/50'
                }`}
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sea/10 font-display text-sm font-bold text-sea-deep">
                  {m.label}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{m.target}</p>
                    {isCurrent ? (
                      <span className="rounded-full bg-sea px-2 py-0.5 text-[10px] text-white">
                        本月
                      </span>
                    ) : null}
                    {done ? (
                      <span className="rounded-full bg-foam px-2 py-0.5 text-[10px] text-sea-deep">
                        達標
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-soft">{m.detail}</p>
                  {path ? (
                    <p className="mt-1 text-xs text-sea-deep">
                      本月新文法：{path.title}（{path.ids.length} 條）
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-ink-soft">
                    目標：單字 {m.vocabTarget}／文法 {m.grammarTarget}
                    {m.quizRateTarget != null ? `／正確率 ${m.quizRateTarget}%` : ''}
                  </p>
                </div>
              </li>
            )
          })}
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

function GapRow({ label, actual, expected, finalTarget, appCap, behind }) {
  const gap = expected - actual
  return (
    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-line/50">
      <ProgressBar
        label={`${label}（目前 ${actual}／此時應約 ${expected}）`}
        value={actual}
        target={finalTarget}
        hint={`完整目標 ${finalTarget} · App 內可練 ${appCap}`}
      />
      <p className={`mt-2 text-xs ${behind ? 'text-coral' : 'text-sea-deep'}`}>
        {behind
          ? `落後約 ${Math.max(0, Math.round(gap))}（相對計畫進度）`
          : gap <= 0
            ? '已追上或超過此時程進度'
            : `距離此時程進度還差約 ${Math.round(gap)}`}
      </p>
    </div>
  )
}
