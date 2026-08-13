import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: '今日', end: true },
  { to: '/vocab', label: '單字' },
  { to: '/practice', label: '練習' },
  { to: '/quiz', label: '測驗' },
  { to: '/plan', label: '計畫' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-24 pt-6 sm:px-5">
      <header className="animate-fade-up mb-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber uppercase">TOEFL Prep</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          TOEFL Go
        </h1>
        <p className="mt-1 text-sm text-ink-soft">四大科練習 · 單字 SRS · 每日節奏</p>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line/80 bg-paper/95 backdrop-blur">
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex touch-target items-center justify-center rounded-xl px-1 text-sm font-medium transition ${
                    isActive ? 'bg-tide text-white' : 'text-ink-soft hover:bg-mist'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
