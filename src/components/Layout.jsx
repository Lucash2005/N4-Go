import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: '首頁', icon: HomeIcon },
  { to: '/flashcards', label: '卡片', icon: CardIcon },
  { to: '/quiz', label: '測驗', icon: QuizIcon },
  { to: '/schedule', label: '計畫', icon: CalendarIcon },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-8">
      <header className="animate-fade-up mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-[0.2em] text-sea">JLPT N4</p>
          <h1 className="font-display text-3xl font-bold tracking-wide text-ink sm:text-4xl">
            N4 Go
          </h1>
          <p className="mt-1 text-sm text-ink-soft">淡青日系學習助手 · 目標 2026.12</p>
        </div>
        <div className="hidden rounded-2xl bg-sea/10 px-3 py-2 text-xs text-sea-deep sm:block">
          本地儲存 · 可離線使用
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-white/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:static sm:mt-10 sm:rounded-2xl sm:border sm:bg-white/70 sm:px-2 sm:py-2 sm:shadow-none"
        aria-label="主要導覽"
      >
        <ul className="mx-auto grid max-w-5xl grid-cols-4 gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'touch-target flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs transition sm:flex-row sm:gap-2 sm:text-sm',
                    isActive
                      ? 'bg-sea text-white shadow-sm'
                      : 'text-ink-soft hover:bg-foam hover:text-ink',
                  ].join(' ')
                }
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 3h8a2 2 0 0 1 2 2v12" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function QuizIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.2 9.4a2.8 2.8 0 1 1 4.3 2.4c-.8.5-1.5 1.1-1.5 2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.8" r="1" fill="currentColor" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
