import { NextResponse } from 'next/server'

// In-memory analytics tracking
const analyticsData = {
  conversations: new Map<string, { messages: number; started: Date; leadCaptured: boolean; bookingCreated: boolean }>(),
  hourlyMessages: new Array(24).fill(0),
  dailyStats: new Map<string, { conversations: number; messages: number; leads: number; bookings: number }>(),
}

export function trackMessage(sessionId: string, isLead: boolean, isBooking: boolean) {
  const hour = new Date().getHours()
  analyticsData.hourlyMessages[hour]++

  const today = new Date().toISOString().split('T')[0]
  if (!analyticsData.dailyStats.has(today)) {
    analyticsData.dailyStats.set(today, { conversations: 0, messages: 0, leads: 0, bookings: 0 })
  }
  const stats = analyticsData.dailyStats.get(today)!
  stats.messages++

  if (!analyticsData.conversations.has(sessionId)) {
    analyticsData.conversations.set(sessionId, { messages: 0, started: new Date(), leadCaptured: false, bookingCreated: false })
    stats.conversations++
  }

  const conv = analyticsData.conversations.get(sessionId)!
  conv.messages++
  if (isLead && !conv.leadCaptured) {
    conv.leadCaptured = true
    stats.leads++
  }
  if (isBooking && !conv.bookingCreated) {
    conv.bookingCreated = true
    stats.bookings++
  }
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const todayStats = analyticsData.dailyStats.get(today) || { conversations: 0, messages: 0, leads: 0, bookings: 0 }

  const totalConversations = analyticsData.conversations.size
  const totalWithLeads = Array.from(analyticsData.conversations.values()).filter(c => c.leadCaptured).length
  const totalWithBookings = Array.from(analyticsData.conversations.values()).filter(c => c.bookingCreated).length

  const peakHour = analyticsData.hourlyMessages.indexOf(Math.max(...analyticsData.hourlyMessages))

  return NextResponse.json({
    today: todayStats,
    totals: {
      conversations: totalConversations,
      leads: totalWithLeads,
      bookings: totalWithBookings,
      lead_rate: totalConversations > 0 ? (totalWithLeads / totalConversations * 100).toFixed(1) + '%' : '0%',
      booking_rate: totalConversations > 0 ? (totalWithBookings / totalConversations * 100).toFixed(1) + '%' : '0%',
    },
    peak_hour: peakHour,
    hourly_distribution: analyticsData.hourlyMessages,
    daily_history: Object.fromEntries(analyticsData.dailyStats),
  })
}
