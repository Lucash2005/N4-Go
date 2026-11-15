import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import SprintChecklist from '../components/SprintChecklist'
import { useProgress } from '../hooks/useProgress'
import { getStudyPhase } from '../data/studyPhases'
import { buildSprintDeck, loadSprintPins } from '../utils/sprintQueue'
import { wrongBankCount } from '../utils/wrongBank'
import { getSprintChecklistStats } from '../utils/sprintChecklist'

export default function Sprint() {
  const { cardProgress } = useProgress()
  const phase = getStudyPhase()
  const wrongCount = wrongBankCount()
  const pins = loadSprintPins()
  const deckInfo = useMemo(
    () => buildSprintDeck({ cardProgress, limit: 24 }),
    [cardProgress],
  )
  const checklist = getSprintChecklistStats()

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <p className="text-xs font-medium tracking-wide text-coral">EXAM SPRINT</p>
        <h1 className="font-display text-2xl font-bold text-ink">考前衝刺模式</h1>
        <p className="mt-1 text-sm text-ink-soft">
          聚焦錯題、不熟悉卡片與高頻易混文法；搭配限時小考與 20 天打卡，把最後時間用在刀口上。
        </p>
        <p className="mt-2 text-xs text-sea-deep">
          目前階段：{phase.title}（{phase.period}）
          {checklist.inWindow ? ` · 衝刺第 ${checklist.dayIndex} 天` : ''}
        </p>
      </section>

      <SprintChecklist />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="surface soft-shadow flex flex-col rounded-3xl p-5">
          <h2 className="font-display text-lg font-bold text-ink">衝刺字卡</h2>
          <p className="mt-2 flex-1 text-sm text-ink-soft">
            本輪約 {deckInfo.stats.total} 張：錯題 {deckInfo.stats.wrong} · 釘選{' '}
            {deckInfo.stats.pins} · 文法 {deckInfo.stats.grammar} · 單字 {deckInfo.stats.vocab}
            {wrongCount ? ` · 錯題本 ${wrongCount}` : ''}
            {pins.ids.length ? ` · 釘選佇列 ${pins.ids.length}` : ''}
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            評分用「陌生／模糊／記得／熟練」；陌生與模糊會留在本輪高頻重現。
          </p>
          <Link
            to="/flashcards?mode=sprint"
            className="mt-4 block rounded-2xl bg-coral px-4 py-3 text-center text-sm font-medium text-white hover:bg-coral/90"
          >
            開始衝刺字卡
          </Link>
        </section>

        <section className="surface soft-shadow flex flex-col rounded-3xl p-5">
          <h2 className="font-display text-lg font-bold text-ink">限時模擬小考</h2>
          <p className="mt-2 flex-1 text-sm text-ink-soft">
            隨機 18 題高頻單字／文法選擇題，限時 10 分鐘。結束後可一鍵把錯題釘進衝刺清單。
          </p>
          <Link
            to="/quiz?mode=quick"
            className="mt-4 block rounded-2xl bg-sea px-4 py-3 text-center text-sm font-medium text-white hover:bg-sea-deep"
          >
            開始限時小考
          </Link>
        </section>

        <section className="surface soft-shadow flex flex-col rounded-3xl p-5 sm:col-span-2">
          <h2 className="font-display text-lg font-bold text-ink">快速入口</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/wrong-bank"
              className="rounded-full bg-white px-3 py-1.5 text-xs text-ink ring-1 ring-line hover:bg-foam"
            >
              錯題本{wrongCount ? `（${wrongCount}）` : ''}
            </Link>
            <Link
              to="/mock"
              className="rounded-full bg-white px-3 py-1.5 text-xs text-ink ring-1 ring-line hover:bg-foam"
            >
              全真計時模考
            </Link>
            <Link
              to="/flashcards?mode=today-review"
              className="rounded-full bg-white px-3 py-1.5 text-xs text-ink ring-1 ring-line hover:bg-foam"
            >
              SRS 到期複習
            </Link>
            <Link
              to="/drill"
              className="rounded-full bg-white px-3 py-1.5 text-xs text-ink ring-1 ring-line hover:bg-foam"
            >
              基礎加強
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
