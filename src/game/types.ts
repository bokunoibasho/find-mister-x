export type Transport = 'taxi' | 'bus' | 'underground'
export type Ticket = Transport | 'black'
export type EdgeType = Transport | 'ferry'
export type Role = 'detective' | 'mrx'
export type Difficulty = 'easy' | 'normal' | 'hard'

export interface Move {
  to: number
  ticket: Ticket
}

export interface DetectiveTickets {
  taxi: number
  bus: number
  underground: number
}

export interface MrXTickets extends DetectiveTickets {
  black: number
}

export interface Detective {
  id: number
  name: string
  color: string
  position: number
  tickets: DetectiveTickets
}

export interface MrX {
  position: number
  tickets: MrXTickets
  doubleRemaining: number
  lastRevealed: number | null
}

export interface LogEntry {
  round: number
  ticket: Ticket
  /** Mr X position, only filled on reveal rounds. */
  revealed: number | null
}

export type Phase = 'mrx' | 'detectives' | 'detective-win' | 'mrx-win'

export interface GameConfig {
  playerRole: Role
  detectiveCount: number
  difficulty: Difficulty
}

export interface GameState {
  config: GameConfig
  phase: Phase
  round: number
  totalRounds: number
  reveals: number[]
  mrx: MrX
  detectives: Detective[]
  /** index of the detective whose turn it is during the detectives phase */
  currentDetective: number
  log: LogEntry[]
  /** true while Mr X is in the middle of a double move (one move already made) */
  doubleInProgress: boolean
}
