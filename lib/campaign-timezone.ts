/** Calendar-day calculations use the campaign's IANA time zone, never the viewer's locale. */
export function campaignToday(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function campaignDaysUntil(date: string, timezone: string, now = new Date()): number {
  const today = campaignToday(timezone, now)
  return Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000)
}
