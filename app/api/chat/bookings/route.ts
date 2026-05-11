import { NextRequest, NextResponse } from 'next/server'

// In-memory bookings store
let bookingsStore: Array<{
  id: string
  name: string
  phone: string
  email?: string
  service: string
  preferred_date?: string
  preferred_time?: string
  address?: string
  zone?: string
  notes?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  session_id?: string
  created_at: string
}> = []

export function addBooking(booking: typeof bookingsStore[0]) {
  bookingsStore.push(booking)
}

export function getBookings() {
  return bookingsStore
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let filtered = bookingsStore
  if (status) {
    filtered = bookingsStore.filter(b => b.status === status)
  }

  return NextResponse.json({
    bookings: filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    total: filtered.length,
    by_status: {
      pending: bookingsStore.filter(b => b.status === 'pending').length,
      confirmed: bookingsStore.filter(b => b.status === 'confirmed').length,
      cancelled: bookingsStore.filter(b => b.status === 'cancelled').length,
      completed: bookingsStore.filter(b => b.status === 'completed').length,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()

  const booking = bookingsStore.find(b => b.id === id)
  if (!booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  booking.status = status
  return NextResponse.json({ booking })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.name || !body.phone || !body.service) {
    return NextResponse.json(
      { error: 'Faltan campos obligatorios: name, phone, service' },
      { status: 400 }
    )
  }

  const booking = {
    id: `booking_${Date.now()}`,
    name: body.name,
    phone: body.phone,
    email: body.email,
    service: body.service,
    preferred_date: body.preferred_date,
    preferred_time: body.preferred_time,
    address: body.address,
    zone: body.zone,
    notes: body.notes,
    status: 'pending' as const,
    session_id: body.session_id,
    created_at: new Date().toISOString(),
  }

  bookingsStore.push(booking)
  return NextResponse.json({ booking }, { status: 201 })
}
