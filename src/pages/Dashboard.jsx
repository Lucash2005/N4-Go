import { Link } from 'react-router-dom'
import { useState } from 'react'
import { CONTENT_VERSION } from '../data/config'
import Countdown from '../components/Countdown'
import ProgressBar from '../components/ProgressBar'
import { DRILL_BANK_SIZE } from '../data/drill'
import { useProgress } from '../hooks/useProgress'
import { getPlanProgress } from '../utils/planProgress'

export default function Dashboard() {
  const {
    dailyTasks,
    toggleTask,
    setTaskDone,
    learnedVocab,
    learningVocab,
    weekVocabGain,
    weekGrammarGain,
    learnedGrammar,
    reviewCount,
    dueCount,
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
    catchUpTodayPlan,
    applyVocabUpdate,
    vocabUpdatePending,
    isStudied,
    grammarPath,
    monthGrammarProgress,
    dueDrillCount,
    vocabLevelCounts,
    reportedCount,
    reportedItems,
    clearCardReports,
    copyReportsExport,
    unreportCardIssue,
  } = useProgress()
  const [exportMsg, setExportMsg] = useState('')
  const [vocabMsg, setVocabMsg] = useState('')

  const doneCount = dailyTasks.filter((t) => t.done).length
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
    weekVocabGain,
    weekGrammarGain,
  })
  const planStatus =
    plan.severity === 'ok' ? '節奏可用' : plan.severity === 'mid' ? '需加快' : '需加量追'
  const planTone =
    plan.severity === 'ok'
      ? 'bg-sea/15 text-sea-deep'
      : plan.severity === 'mid'
        ? 'bg-sand text-ink'
        : 'bg-coral/15 text-coral'

  return (
    <div className="space-y-5">
      <Countdown />

      {vocabUpdatePending ? (
        <section className="rounded-3xl border border-sea/30 bg-sea/10 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">詞彙內容已更新（v{CONTENT_VERSION}）</h2>
              <p className="mt-1 text-sm text-ink-soft">
                今日單字不會自動換新；請手動載入最新詞彙。若要重抽今日進度，再按「重新抽題」。
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await applyVocabUpdate()
                  setVocabMsg('已載入最新詞彙')
                } catch {
                  setVocabMsg('載入失敗，請稍後再試')
                }
              }}
              className="rounded-full bg-sea px-4 py-2 text-sm text-white hover:bg-sea-deep"
            >
              載入最新詞彙
            </button>
          </div>
          {vocabMsg ? <p className="mt-2 text-xs text-sea-deep">{vocabMsg}</p> : null}
        </section>
      ) : null}

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">往目標前進</h2>
            <p className="mt-1 text-sm text-ink-soft">
              看本月／總目標與近一週實際前進 · {grammarPath.title}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${planTone}`}>
            {planStatus}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <ProgressBar
            label={`本月單字（${plan.currentMilestone?.label || ''}目標）`}
            value={learnedVocab}
            target={plan.month.vocabTarget}
            hint={
              plan.momentum.daysToMonthVocab != null
                ? `還差 ${plan.month.vocabRemaining} · 依近 7 日速度約 ${plan.momentum.daysToMonthVocab} 天可到`
                : `還差 ${plan.month.vocabRemaining} · 近 7 日新掌握 ${weekVocabGain}（開始評分後會算出預估）`
            }
          />
          <ProgressBar
            label="N4 單字總目標"
            value={learnedVocab}
            target={plan.final.vocabTarget}
            hint={
              plan.momentum.daysToFinalVocab != null
                ? `還差 ${plan.final.vocabRemaining} · 約 ${plan.momentum.daysToFinalVocab} 天（近 7 日均速 ${plan.momentum.dailyVocabPace}/天）`
                : `還差 ${plan.final.vocabRemaining} · 學習中 ${learningVocab}`
            }
          />
          <ProgressBar
            label={`本月文法（${plan.currentMilestone?.label || ''}）`}
            value={learnedGrammar}
            target={plan.month.grammarTarget}
            hint={`還差 ${plan.month.grammarRemaining} · 近 7 日 +${weekGrammarGain}`}
          />
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl bg-foam/70 p-3 text-sm text-ink-soft sm:grid-cols-3">
          <p>
            近 7 日新掌握單字{' '}
            <span className="font-semibold text-sea-deep">{weekVocabGain}</span>
          </p>
          <p>
            近 7 日新掌握文法{' '}
            <span className="font-semibold text-sea-deep">{weekGrammarGain}</span>
          </p>
          <p>
            考試還有 <span className="font-semibold text-ink">{plan.daysToExam}</span> 天
          </p>
        </div>

        {vocabLevelCounts ? (
          <p className="mt-3 text-xs text-ink-soft">
            詞庫 {vocabLevelCounts.core} 核心（N5 {vocabLevelCounts.n5}＋N4{' '}
            {vocabLevelCounts.n4}）＋ {vocabLevelCounts.extension} 延伸 · 每日與瀏覽預設只抽
            N5／N4，延伸需手動開啟
          </p>
        ) : null}

        <p className="mt-3 text-xs text-ink-soft">
          掌握標準偏誠實：同一字「簡單」或「記得」需成功約兩次才進進度；到期複習不會扣掉已掌握。
          動力看「本週有沒有 +N」與「離本月目標還多近」，不是每天被「此時應約」追著跑。
          {todayVocab.length > 15 ? ` 今天已加量至 ${todayVocab.length} 個單字（手動重抽／加量）。` : ''}
        </p>
        <Link
          to="/schedule"
          className="mt-4 inline-flex rounded-xl bg-sea px-4 py-2.5 text-sm text-white hover:bg-sea-deep"
        >
          看補救措施 →
        </Link>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">今日自動排程</h2>
            <p className="mt-1 text-sm text-ink-soft">
              文法依 8→12 月路線解鎖；今日單字優先抽本月文法例句裡的詞
            </p>
          </div>
          <button
            type="button"
            onClick={catchUpTodayPlan}
            className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-foam"
            title="落後時手動加量至建議字數（會重抽今日單字）"
          >
            手動加量
          </button>
          <button
            type="button"
            onClick={reshuffleTodayPlan}
            className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-foam"
            title="已掌握的字不會再出現，改抽新字；到期複習請用「到期複習」"
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
            note={`${grammarPath.label}：${grammarPath.title}。前兩張是て形／ない形活用。${grammarPath.howTo}`}
          />
          <PlanBlock
            title="到期複習（SRS）"
            progress={`${reviewStudied}/${todayReview.length || 0}`}
            to="/flashcards?mode=today-review"
            cta="開始複習"
            items={todayReview}
            isStudied={isStudied}
            emptyText="尚無到期卡片。練新單字並評分後，之後會自動排程回來"
          />
          <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink">聽力練習</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  循環播放單字＋例句 {listenCount}/{listenTarget}（可鎖屏）
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
          <div className="rounded-2xl bg-coral/5 p-4 ring-1 ring-coral/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink">基礎加強（選修）</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  てから／に／讀解型填空 · 題庫 {DRILL_BANK_SIZE} 題 · 錯題獨立複習
                  {dueDrillCount > 0 ? ` · ${dueDrillCount} 題待複習` : ''}
                </p>
              </div>
              <Link
                to="/drill"
                className="rounded-xl bg-coral px-3 py-2 text-sm text-white hover:bg-coral/90"
              >
                開始加強
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-1 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">本月文法路線</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {monthGrammarProgress.label}「{monthGrammarProgress.title}」· {monthGrammarProgress.focus}
            </p>
          </div>
          <span className="rounded-full bg-foam px-3 py-1 text-xs text-sea-deep">
            {monthGrammarProgress.learned}/{monthGrammarProgress.total}
          </span>
        </div>
        <div className="mt-4">
          <ProgressBar
            label="本月句型"
            value={monthGrammarProgress.learned}
            target={monthGrammarProgress.total}
            hint={monthGrammarProgress.howTo}
          />
        </div>
        {monthGrammarProgress.next?.length ? (
          <div className="mt-4">
            <p className="text-xs text-ink-soft">接下來要學</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {monthGrammarProgress.next.map((card) => (
                <li key={card.id} className="rounded-full bg-foam px-2.5 py-1 text-xs text-ink">
                  {card.word}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-sea-deep">本月句型都已標記學會，可專心複習與測驗</p>
        )}
      </section>

      <section className="surface soft-shadow animate-fade-up stagger-2 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">整體學習進度</h2>
            <p className="mt-1 text-sm text-ink-soft">目標對齊 N4：單字 1500／文法 80</p>
          </div>
          <span className="rounded-full bg-foam px-3 py-1 text-xs text-sea-deep">
            今日到期 {dueCount ?? reviewCount}
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

      {reportedCount > 0 ? (
        <section className="surface soft-shadow animate-fade-up rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">已回報隱藏</h2>
              <p className="mt-1 text-sm text-ink-soft">
                本機暫存 {reportedCount} 張，不會再出現於練習／瀏覽；確認修正後請手動按「解除隱藏」。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await copyReportsExport()
                    setExportMsg('已複製回報清單到剪貼簿，可貼給開發者')
                  } catch {
                    setExportMsg('複製失敗，請改用瀏覽器允許剪貼簿權限')
                  }
                  window.setTimeout(() => setExportMsg(''), 3500)
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-foam"
              >
                複製回報清單
              </button>
              <button
                type="button"
                onClick={clearCardReports}
                className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-soft ring-1 ring-line hover:bg-foam"
              >
                全部恢復顯示
              </button>
            </div>
          </div>
          {exportMsg ? (
            <p className="mt-2 text-xs text-sea-deep">{exportMsg}</p>
          ) : null}
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {(reportedItems || []).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-foam/70 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{item.word}</span>
                  <span className="ml-2 text-xs text-ink-soft">
                    {(item.reasonLabels || [item.reasonLabel]).filter(Boolean).join('、')}
                  </span>
                  {item.note ? (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-ink-soft line-clamp-6">
                      {item.note}
                    </p>
                  ) : item.geminiAnalysis ? (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-ink-soft line-clamp-6">
                      {item.geminiAnalysis}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => unreportCardIssue(item.id)}
                  className="text-xs text-sea-deep underline-offset-2 hover:underline"
                >
                  恢復
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

function PlanBlock({ title, progress, to, cta, items, isStudied, emptyText, note }) {
  return (
    <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-line/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-ink-soft">進度 {progress}</p>
          {note ? <p className="mt-1 text-xs leading-relaxed text-sea-deep">{note}</p> : null}
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
              {card.type === 'form' ? `${card.word}（${card.category}）` : card.word}
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
