import type { EdgeType, Ticket } from '../game/types'

export const TICKET_META: Record<Ticket, { label: string; color: string; short: string }> = {
  taxi: { label: 'タクシー', color: '#eab308', short: 'T' },
  bus: { label: 'バス', color: '#22c55e', short: 'B' },
  underground: { label: '地下鉄', color: '#ef4444', short: 'U' },
  black: { label: 'ブラック', color: '#1f2433', short: 'X' }
}

export const EDGE_STYLE: Record<EdgeType, { color: string; width: number; dash?: string; opacity: number }> = {
  taxi: { color: '#cbd5e1', width: 1.8, opacity: 0.9 },
  bus: { color: '#34d399', width: 3.2, opacity: 0.95 },
  underground: { color: '#f87171', width: 4.4, opacity: 0.95 },
  ferry: { color: '#38bdf8', width: 3.2, dash: '8 6', opacity: 0.95 }
}

// Dark outline drawn under each route so overlapping lines stay distinguishable.
export const EDGE_HALO = '#0a0e1c'

export const EDGE_LABEL: Record<EdgeType, string> = {
  taxi: 'タクシー',
  bus: 'バス',
  underground: '地下鉄',
  ferry: 'フェリー(黒)'
}
