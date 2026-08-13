import { Link } from 'react-router-dom'
import Countdown from '../components/Countdown'
import ProgressBar from '../components/ProgressBar'
import { useProgress } from '../hooks/useProgress'

export default function Dashboard() {
  const {
    dailyTasks,
    toggleTask,
    learnedCount,
    dueCount,
    targets,
    totalVocab,
    todayVocab,
    todayReview,
    vocabStudied,
    reviewStudied,
    sectionStats,
    quizStats,
    reshuffleTodayPlan,
    practiceDone,
  } = useProgress()

  const doneCount = dailyTasks.filter((t) => t.done).length

  return (
    <div className="space-y-5">
      <Countdown />

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">今日節奏</h2>
            <p className="mt-1 text-sm text-ink-soft">單字回想評分＋四大科短練習</p>
          </div>
          <button
            type="button"
            onClick={reshuffleTodayPlan}
            className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-mist"
          >
            重新抽題
          </button>
        </div>

        <div className="space-y-3">
          <PlanLink
            title="今日單字"
            progress={`${vocabStudied}/${todayVocab.length}`}
            to="/vocab?mode=today"
            cta="開始 SRS"
          />
          <PlanLink
            title="到期複習"
            progress={`${reviewStudied}/${todayReview.length}`}
            to="/vocab?mode=review"
            cta="開始複習"
            empty={!todayReview.length}
            emptyText="目前沒有到期單字"
          />
          <PlanLink
            title="閱讀／聽力／口說／寫作"
            progress={
              ['reading', 'listening', 'speaking', 'writing'].filter((k) => practiceDone[k])
                .length + '/4 科已練'
            }
            to="/practice"
            cta="去練習"
          />
        </div>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-2 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">整體進度</h2>
            <p className="mt-1 text-sm text-ink-soft">先把節奏做穩，再拉長模考</p>
          </div>
          <span className="rounded-full bg-mist px-3 py-1 text-xs text-tide">到期 {dueCount}</span>
        </div>
        <div className="space-y-4">
          <ProgressBar
            label="已掌握單字"
            value={learnedCount}
            target={targets.vocabulary}
            hint={`目前題庫 ${totalVocab} 字，可持續擴充`}
          />
          <ProgressBar label="閱讀完成篇數" value={sectionStats.reading} target={targets.reading} />
          <ProgressBar
            label="聽力完成題組"
            value={sectionStats.listening}
            target={targets.listening}
          />
          <ProgressBar
            label="口說完成題"
            value={sectionStats.speaking}
            target={targets.speaking}
          />
          <ProgressBar
            label="寫作完成題"
            value={sectionStats.writing}
            target={targets.writing}
          />
        </div>
        {quizStats.lastScore ? (
          <p className="mt-4 text-xs text-ink-soft">
            最近測驗：{quizStats.lastScore.correct}/{quizStats.lastScore.total}
          </p>
        ) : null}
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-3 rounded-3xl p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-ink">今日任務</h2>
        <p className="mt-1 text-sm text-ink-soft">
          完成 {doneCount}/{dailyTasks.length} 項
        </p>
        <ul className="mt-4 space-y-2">
          {dailyTasks.map((task) => (
            <li key={task.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-line/50">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="size-5 accent-[var(--color-tide)]"
                />
                <span className={task.done ? 'text-ink-soft line-through' : 'text-ink'}>
                  {task.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function PlanLink({ title, progress, to, cta, empty, emptyText }) {
  return (
    <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{empty ? emptyText : `進度 ${progress}`}</p>
        </div>
        {!empty ? (
          <Link
            to={to}
            className="rounded-xl bg-tide px-3 py-2 text-sm text-white hover:bg-tide-deep"
          >
            {cta}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
