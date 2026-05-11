import { NextRequest, NextResponse } from 'next/server'

// In-memory leads store (shared with main chat route via module-level state)
// In production this would query Supabase
let leadsStore: Array<{
  id: string
  name?: string
  phone?: string
  email?: string
  service_interest?: string
  status: 'new' | 'contacted' | 'converted' | 'lost'
  session_id: string
  created_at: string
}> = []

export function addLead(lead: typeof leadsStore[0]) {
  leadsStore.push(lead)
}

export function getLeads() {
  return leadsStore
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let filtered = leadsStore
  if (status) {
    filtered = leadsStore.filter(l => l.status === status)
  }

  return NextResponse.json({
    leads: filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    total: filtered.length,
    by_status: {
      new: leadsStore.filter(l => l.status === 'new').length,
      contacted: leadsStore.filter(l => l.status === 'contacted').length,
      converted: leadsStore.filter(l => l.status === 'converted').length,
      lost: leadsStore.filter(l => l.status === 'lost').length,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()

  const lead = leadsStore.find(l => l.id === id)
  if (!lead) {
    return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
  }

  if (!['new', 'contacted', 'converted', 'lost'].includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  lead.status = status
  return NextResponse.json({ lead })
}
