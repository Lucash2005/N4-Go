import { Link } from 'react-router-dom'
import { getStudyPhase } from '../data/studyPhases'
import { getReadingStats } from './ReadingPractice'
import { getListeningStats } from './ListeningPractice'
import { wrongBankCount } from '../utils/wrongBank'

export default function SkillsHub() {
  const phase = getStudyPhase()
  const reading = getReadingStats()
  const listening = getListeningStats()
  const wrong = wrongBankCount()
  const skillsUnlocked = phase.id !== 'foundation'

  return (
    <div className="space-y-4">
      <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <p className="text-xs font-medium tracking-wide text-sea">SKILLS</p>
        <h2 className="font-display text-2xl font-bold text-ink">讀解・聽解・錯題</h2>
        <p className="mt-1 text-sm text-ink-soft">
          目前階段：{phase.title}（{phase.period}）
          {skillsUnlocked ? ' · 讀聽已納入每日配額' : ' · 10/21 起正式納入每日配額，現在可先試做'}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/reading"
          className="surface soft-shadow rounded-3xl p-5 transition hover:bg-foam/80"
        >
          <p className="text-xs text-sea">READING</p>
          <h3 className="font-display text-xl font-bold text-ink">讀解練習</h3>
          <p className="mt-1 text-sm text-ink-soft">
            短文／中文／情報検索 · {reading.doneCount}/{reading.total}
          </p>
        </Link>
        <Link
          to="/listening"
          className="surface soft-shadow rounded-3xl p-5 transition hover:bg-foam/80"
        >
          <p className="text-xs text-sea">LISTENING</p>
          <h3 className="font-display text-xl font-bold text-ink">聽解練習</h3>
          <p className="mt-1 text-sm text-ink-soft">
            課題／ポイント理解 · {listening.doneCount}/{listening.total}
          </p>
        </Link>
        <Link
          to="/wrong-bank"
          className="surface soft-shadow rounded-3xl p-5 transition hover:bg-foam/80"
        >
          <p className="text-xs text-sea">WRONG BANK</p>
          <h3 className="font-display text-xl font-bold text-ink">錯題本</h3>
          <p className="mt-1 text-sm text-ink-soft">待複習 {wrong} 題</p>
        </Link>
        <Link
          to="/mock"
          className="surface soft-shadow rounded-3xl p-5 transition hover:bg-foam/80"
        >
          <p className="text-xs text-sea">MOCK</p>
          <h3 className="font-display text-xl font-bold text-ink">計時模考</h3>
          <p className="mt-1 text-sm text-ink-soft">
            語彙 30 分 · 文法讀解 55 分 · 聽解 35 分
            {phase.id === 'sprint' ? ' · 衝刺期建議每日一節' : ''}
          </p>
        </Link>
      </div>
    </div>
  )
}
