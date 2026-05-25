import type { EdgeType, Ticket } from '../game/types'

export const TICKET_META: Record<Ticket, { label: string; color: string; short: string }> = {
  taxi: { label: 'タクシー', color: '#eab308', short: 'T' },
  bus: { label: 'バス', color: '#22c55e', short: 'B' },
  underground: { label: '地下鉄', color: '#ef4444', short: 'U' },
  black: { label: 'ブラック', color: '#1f2433', short: 'X' }
}

export const EDGE_STYLE: Record<EdgeType, { color: string; width: number; dash?: string; opacity: number }> = {
  taxi: { color: '#8b94a7', width: 1.1, opacity: 0.5 },
  bus: { color: '#22c55e', width: 2.2, opacity: 0.65 },
  underground: { color: '#ef4444', width: 3.4, opacity: 0.7 },
  ferry: { color: '#38bdf8', width: 2.4, dash: '6 5', opacity: 0.8 }
}
