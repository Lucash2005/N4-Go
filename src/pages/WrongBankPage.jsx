import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  clearWrongBank,
  loadWrongBank,
  pickWrongReviewIds,
  wrongBankCount,
  wrongBankList,
} from '../utils/wrongBank'
import { getListeningById } from '../data/listening'
import { readingQuestions } from '../data/readings'

export default function WrongBankPage() {
  const [store, setStore] = useState(() => loadWrongBank())
  const items = useMemo(() => wrongBankList(store), [store])
  const count = wrongBankCount(store)
  const reviewIds = pickWrongReviewIds(12, store)

  function resolveLabel(id) {
    const listening = getListeningById(id)
    if (listening) return { kind: '聽解', title: listening.question }
    const reading = readingQuestions.find((r) => r.id === id)
    if (reading) return { kind: '讀解', title: reading.prompt || reading.title || id }
    return { kind: '測驗／單字', title: id }
  }

  return (
    <div className="space-y-4">
      <section className="surface soft-shadow rounded-3xl p-5 sm:p-6">
        <p className="text-xs font-medium tracking-wide text-sea">WRONG BANK</p>
        <h2 className="font-display text-2xl font-bold text-ink">錯題本</h2>
        <p className="mt-1 text-sm text-ink-soft">
          答錯會自動收錄。目前 {count} 題 · 優先複習高錯次數項目。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/reading"
            className="rounded-full bg-sea px-4 py-2 text-sm font-medium text-white"
          >
            去讀解練習
          </Link>
          <Link
            to="/listening"
            className="rounded-full bg-white px-4 py-2 text-sm text-ink ring-1 ring-line"
          >
            去聽解練習
          </Link>
          <Link
            to="/quiz"
            className="rounded-full bg-white px-4 py-2 text-sm text-ink ring-1 ring-line"
          >
            去綜合測驗
          </Link>
          {count > 0 ? (
            <button
              type="button"
              onClick={() => setStore(clearWrongBank())}
              className="rounded-full bg-white px-3 py-2 text-xs text-ink-soft ring-1 ring-line"
            >
              清空錯題本
            </button>
          ) : null}
        </div>
      </section>

      {reviewIds.length ? (
        <section className="rounded-3xl border border-line bg-foam/60 p-4 sm:p-5">
          <h3 className="font-display text-lg font-bold text-ink">今日優先複習</h3>
          <ul className="mt-3 space-y-2">
            {reviewIds.map((id) => {
              const meta = resolveLabel(id)
              const row = store.items[id]
              return (
                <li key={id} className="rounded-2xl bg-white/80 px-3 py-2 text-sm">
                  <span className="text-xs text-sea-deep">{meta.kind}</span>
                  <p className="font-medium text-ink line-clamp-2">{meta.title}</p>
                  <p className="text-xs text-ink-soft">錯 {row?.wrongCount || 1} 次 · {id}</p>
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <section className="rounded-3xl border border-line bg-foam/60 p-4 text-sm text-ink-soft">
          目前沒有錯題。去做讀解／聽解或測驗，答錯會自動進來。
        </section>
      )}

      {items.length ? (
        <section className="surface soft-shadow rounded-3xl p-5">
          <h3 className="font-display text-lg font-bold text-ink">全部錯題</h3>
          <ul className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
            {items.map((row) => {
              const meta = resolveLabel(row.id)
              return (
                <li key={row.id} className="rounded-2xl bg-foam/70 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-sea-deep">{meta.kind}</span>
                      <p className="font-medium text-ink line-clamp-2">{row.prompt || meta.title}</p>
                      <p className="text-xs text-ink-soft">
                        {row.id} · 錯 {row.wrongCount} · 最近 {row.lastWrongAt || '—'}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
