export function getCountdown(examDate, now = new Date()) {
  const diff = Math.max(0, examDate.getTime() - now.getTime())
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds, done: diff === 0 }
}

export function pad2(n) {
  return String(n).padStart(2, '0')
}
