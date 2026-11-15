import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildSprintDayPlans,
  getSprintChecklistStats,
  loadSprintChecklist,
  toggleSprintTask,
} from '../utils/sprintChecklist'
import { todayKey } from '../utils/storage'

/**
 * Visual 20-day sprint checklist with localStorage progress.
 * @param {{ compact?: boolean }} [props]
 */
export default function SprintChecklist({ compact = false }) {
  const [store, setStore] = useState(() => loadSprintChecklist())
  const [expanded, setExpanded] = useState(!compact)
  const today = todayKey()

  const stats = useMemo(() => getSprintChecklistStats(store, today), [store, today])
  const plans = stats.plans.length ? stats.plans : buildSprintDayPlans()

  function onToggle(date, taskId) {
    setStore(toggleSprintTask(date, taskId, store))
  }

  return (
    <section className="rounded-3xl border border-coral/25 bg-gradient-to-br from-coral/10 via-foam/40 to-sea/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-coral">20-DAY SPRINT</p>
          <h2 className="font-display text-lg font-bold text-ink sm:text-xl">考前 20 天衝刺打卡</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {stats.inWindow
              ? `第 ${stats.dayIndex}／20 天 · 已完成 ${stats.doneTasks}/${stats.totalTasks} 項（${stats.percent}%）`
              : `衝刺窗 ${stats.start}〜${stats.end} · 已完成 ${stats.percent}%`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full bg-white px-3 py-1.5 text-xs text-ink ring-1 ring-line hover:bg-foam"
        >
          {expanded ? '收合' : '展開日程'}
        </button>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/70 ring-1 ring-line/40">
        <div
          className="h-full rounded-full bg-coral transition-[width] duration-500"
          style={{ width: `${stats.percent}%` }}
        />
      </div>

      {stats.todayPlan ? (
        <div className="mt-4 rounded-2xl bg-white/80 p-3 ring-1 ring-line/50">
          <p className="text-sm font-medium text-ink">
            今天 · Day {stats.todayPlan.day} · {stats.todayPlan.theme}
          </p>
          <p className="mt-1 text-xs text-ink-soft">{stats.todayPlan.focus}</p>
          <ul className="mt-3 space-y-2">
            {stats.todayPlan.tasks.map((task) => {
              const done = Boolean(store.done?.[stats.todayPlan.date]?.[task.id])
              return (
                <li key={task.id} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggle(stats.todayPlan.date, task.id)}
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-sm ring-1 transition ${
                      done
                        ? 'bg-sea text-white ring-sea'
                        : 'bg-foam text-ink-soft ring-line hover:bg-white'
                    }`}
                    aria-pressed={done}
                    aria-label={done ? '取消完成' : '標記完成'}
                  >
                    {done ? '✓' : ''}
                  </button>
                  <span className={`flex-1 text-sm ${done ? 'text-ink-soft line-through' : 'text-ink'}`}>
                    {task.label}
                  </span>
                  {task.href ? (
                    <Link
                      to={task.href}
                      className="rounded-xl bg-sea/10 px-2.5 py-1 text-xs text-sea-deep hover:bg-sea/20"
                    >
                      開始
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
          {plans.map((plan) => {
            const doneCount = plan.tasks.filter((t) => store.done?.[plan.date]?.[t.id]).length
            const full = doneCount === plan.tasks.length
            const isToday = plan.date === today
            return (
              <button
                key={plan.date}
                type="button"
                title={`Day ${plan.day} ${plan.theme}`}
                onClick={() => {
                  const el = document.getElementById(`sprint-day-${plan.day}`)
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }}
                className={`rounded-xl px-1 py-2 text-center text-[10px] sm:text-xs ring-1 transition ${
                  full
                    ? 'bg-sea text-white ring-sea'
                    : isToday
                      ? 'bg-coral/20 text-coral ring-coral/40'
                      : doneCount > 0
                        ? 'bg-sea/15 text-sea-deep ring-sea/30'
                        : 'bg-white/70 text-ink-soft ring-line/60'
                }`}
              >
                D{plan.day}
              </button>
            )
          })}
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {plans.map((plan) => {
            const isToday = plan.date === today
            return (
              <div
                key={plan.date}
                id={`sprint-day-${plan.day}`}
                className={`rounded-2xl p-3 ring-1 ${
                  isToday ? 'bg-coral/10 ring-coral/30' : 'bg-white/60 ring-line/40'
                }`}
              >
                <p className="text-sm font-medium text-ink">
                  Day {plan.day}
                  <span className="ml-2 text-xs font-normal text-ink-soft">{plan.date}</span>
                </p>
                <p className="text-xs text-ink-soft">
                  {plan.theme} — {plan.focus}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.tasks.map((task) => {
                    const done = Boolean(store.done?.[plan.date]?.[task.id])
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onToggle(plan.date, task.id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] ring-1 ${
                          done
                            ? 'bg-sea text-white ring-sea'
                            : 'bg-white text-ink-soft ring-line hover:bg-foam'
                        }`}
                      >
                        {done ? '✓ ' : ''}
                        {task.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
