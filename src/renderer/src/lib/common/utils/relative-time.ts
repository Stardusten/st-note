const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

export const formatRelativeTime = (date: Date | string | number | undefined): string => {
  if (!date) return ""
  const d = new Date(date)
  const now = Date.now()
  const diff = now - d.getTime()

  if (diff < MINUTE) return "now"
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE)
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR)
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }
  if (diff < WEEK) {
    const days = Math.floor(diff / DAY)
    return days === 1 ? "yesterday" : `${days} days ago`
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
