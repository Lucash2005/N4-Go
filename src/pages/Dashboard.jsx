import { Link } from 'react-router-dom'
import Countdown from '../components/Countdown'
import ProgressBar from '../components/ProgressBar'
import { useProgress } from '../hooks/useProgress'

export default function Dashboard() {
  const {
    dailyTasks,
    toggleTask,
    setTaskDone,
    learnedVocab,
    learnedGrammar,
    reviewCount,
    targets,
    totalVocabInApp,
    totalGrammarInApp,
    quizStats,
    todayVocab,
    todayGrammar,
    todayReview,
    vocabStudied,
    grammarStudied,
    reviewStudied,
    listenCount,
    listenTarget,
    reshuffleTodayPlan,
    isStudied,
  } = useProgress()

  const doneCount = dailyTasks.filter((t) => t.done).length

  return (
    <div className="space-y-5">
      <Countdown />

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">今日自動排程</h2>
            <p className="mt-1 text-sm text-ink-soft">
              系統已依進度抽出今日內容，點下方即可開始練習
            </p>
          </div>
          <button
            type="button"
            onClick={reshuffleTodayPlan}
            className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-foam"
          >
            重新抽題
          </button>
        </div>

        <div className="space-y-3">
          <PlanBlock
            title="今日單字"
            progress={`${vocabStudied}/${todayVocab.length}`}
            to="/flashcards?mode=today-vocab"
            cta="開始單字"
            items={todayVocab}
            isStudied={isStudied}
          />
          <PlanBlock
            title="今日文法"
            progress={`${grammarStudied}/${todayGrammar.length}`}
            to="/flashcards?mode=today-grammar"
            cta="開始文法"
            items={todayGrammar}
            isStudied={isStudied}
          />
          <PlanBlock
            title="複習佇列"
            progress={`${reviewStudied}/${todayReview.length || 0}`}
            to="/flashcards?mode=today-review"
            cta="開始複習"
            items={todayReview}
            isStudied={isStudied}
            emptyText="尚無複習項，先把不熟的卡片標成「需要複習」"
          />
          <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink">聽力練習</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  播放今日單字發音 {listenCount}/{listenTarget}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/flashcards?mode=today-listening"
                  className="rounded-xl bg-sea px-3 py-2 text-sm text-white hover:bg-sea-deep"
                >
                  開始聽力
                </Link>
                <button
                  type="button"
                  onClick={() => setTaskDone('listening-15', true)}
                  className="rounded-xl bg-white px-3 py-2 text-sm text-ink ring-1 ring-line"
                >
                  我已練完
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-2 rounded-3xl p-5 sm:p-6">
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

      <section className="surface soft-shadow animate-fade-up stagger-3 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">今日學習任務</h2>
            <p className="mt-1 text-sm text-ink-soft">
              完成 {doneCount}/{dailyTasks.length} 項 · 依排程練習會自動打勾
            </p>
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
        <QuickLink to="/flashcards?mode=today-vocab" title="今日練習" desc="自動排程內容" />
        <QuickLink to="/quiz" title="模擬測驗" desc="隨機抽題即時解析" />
        <QuickLink to="/schedule" title="學習計畫" desc="到 12 月的階段時程" />
      </section>
    </div>
  )
}

function PlanBlock({ title, progress, to, cta, items, isStudied, emptyText }) {
  return (
    <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-ink-soft">進度 {progress}</p>
        </div>
        {items.length > 0 ? (
          <Link
            to={to}
            className="rounded-xl bg-sea px-3 py-2 text-sm text-white hover:bg-sea-deep"
          >
            {cta}
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{emptyText || '今日尚無項目'}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((card) => (
            <li
              key={card.id}
              className={`rounded-full px-2.5 py-1 text-xs ${
                isStudied(card.id)
                  ? 'bg-sea/15 text-sea-deep line-through'
                  : 'bg-foam text-ink'
              }`}
            >
              {card.word}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QuickLink({ to, title, desc }) {
  return (
    <Link
      to={to}
      className="surface soft-shadow animate-fade-up stagger-4 block rounded-2xl p-4 transition hover:-translate-y-0.5 hover:bg-white"
    >
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{desc}</p>
    </Link>
  )
}
