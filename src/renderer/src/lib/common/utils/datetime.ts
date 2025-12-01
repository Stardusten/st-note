import { format } from 'date-fns'

export function formatDateTime(date: Date) {
  const str = format(date, 'yyyy-MM-dd HH:mm:ss')
  return str.endsWith(' 00:00:00') ? str.slice(0, -9) : str
}
