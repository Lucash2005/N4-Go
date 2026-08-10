import { Link } from 'react-router-dom'
import Countdown from '../components/Countdown'
import ProgressBar from '../components/ProgressBar'
import { useProgress } from '../hooks/useProgress'

export default function Dashboard() {
  const {
    dailyTasks,
    toggleTask,
    learnedVocab,
    learnedGrammar,
    reviewCount,
    targets,
    totalVocabInApp,
    totalGrammarInApp,
    quizStats,
  } = useProgress()

  const doneCount = dailyTasks.filter((t) => t.done).length

  return (
    <div className="space-y-5">
      <Countdown />

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">整體學習進度</h2>
            <p className="mt-1 text-sm text-ink-soft">目標對齊 N4：單字 1500／文法 80</p>
          </div>
          <span className="rounded-full bg-foam px-3 py-1 text-xs text-sea-deep">
            複習佇列 {reviewCount}
          </span>
        </div>

        <div className="space-y-5">
          <ProgressBar
            label="已掌握單字"
            value={learnedVocab}
            target={targets.vocabulary}
            hint={`應用內目前收錄 ${totalVocabInApp} 字，可持續擴充資料`}
          />
          <ProgressBar
            label="已學習文法"
            value={learnedGrammar}
            target={targets.grammar}
            hint={`應用內目前收錄 ${totalGrammarInApp} 條文法`}
          />
        </div>

        {quizStats.lastScore ? (
          <p className="mt-4 text-xs text-ink-soft">
            最近測驗：{quizStats.lastScore.correct}/{quizStats.lastScore.total} · 累計答對{' '}
            {quizStats.correct}/{quizStats.attempted || 0}
          </p>
        ) : (
          <p className="mt-4 text-xs text-ink-soft">尚未進行測驗，可到「測驗」開始第一回。</p>
        )}
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-2 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">今日學習任務</h2>
            <p className="mt-1 text-sm text-ink-soft">完成 {doneCount}/{dailyTasks.length} 項</p>
          </div>
        </div>

        <ul className="space-y-2">
          {dailyTasks.map((task) => (
            <li key={task.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-line/50 transition hover:bg-foam/60">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="size-5 accent-sea"
                />
                <span className={task.done ? 'text-ink-soft line-through' : 'text-ink'}>
                  {task.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <QuickLink to="/flashcards" title="翻牌練習" desc="單字／文法卡片 + TTS" />
        <QuickLink to="/quiz" title="模擬測驗" desc="隨機抽題即時解析" />
        <QuickLink to="/schedule" title="學習計畫" desc="到 12 月的階段時程" />
      </section>
    </div>
  )
}

function QuickLink({ to, title, desc }) {
  return (
    <Link
      to={to}
      className="surface soft-shadow animate-fade-up stagger-3 block rounded-2xl p-4 transition hover:-translate-y-0.5 hover:bg-white"
    >
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{desc}</p>
    </Link>
  )
}
