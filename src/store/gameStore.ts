import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chooseDetectiveMove } from '../game/ai/detectives'
import { planMrxTurn } from '../game/ai/misterX'
import {
  canUseDouble,
  createGame,
  detectiveTakeMove,
  isGameOver,
  mrxTakeMove
} from '../game/engine'
import { isPlayerTurn, movesTo } from '../game/selectors'
import type { GameConfig, GameState, Move, Ticket } from '../game/types'

const AI_DELAY = 600

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

interface Store {
  game: GameState | null
  aiThinking: boolean
  selectedNode: number | null
  doubleArmed: boolean
  showBelief: boolean

  newGame: (config: GameConfig) => void
  quit: () => void
  tapNode: (id: number) => void
  chooseTicket: (ticket: Ticket) => void
  cancelSelection: () => void
  toggleDouble: () => void
  toggleBelief: () => void
  runAi: () => Promise<void>
  resumeIfNeeded: () => void
}

export const useGameStore = create<Store>()(
  persist(
    (set, get) => {
      function applyPlayerMove(move: Move) {
        const game = get().game
        if (!game) return
        let next: GameState
        if (game.phase === 'mrx') {
          const useDouble = get().doubleArmed && canUseDouble(game)
          next = mrxTakeMove(game, move, useDouble)
        } else {
          next = detectiveTakeMove(game, move)
        }
        set({ game: next, selectedNode: null, doubleArmed: false })
        if (!isGameOver(next) && !isPlayerTurn(next)) void get().runAi()
      }

      return {
        game: null,
        aiThinking: false,
        selectedNode: null,
        doubleArmed: false,
        showBelief: false,

        newGame: (config) => {
          const game = createGame(config)
          set({
            game,
            aiThinking: false,
            selectedNode: null,
            doubleArmed: false
          })
          if (!isPlayerTurn(game)) void get().runAi()
        },

        quit: () =>
          set({ game: null, aiThinking: false, selectedNode: null, doubleArmed: false }),

        tapNode: (id) => {
          const { game, aiThinking } = get()
          if (!game || aiThinking || !isPlayerTurn(game)) return
          const options = movesTo(game, id)
          if (options.length === 0) {
            set({ selectedNode: null })
            return
          }
          if (options.length === 1) {
            applyPlayerMove(options[0])
            return
          }
          set({ selectedNode: id })
        },

        chooseTicket: (ticket) => {
          const { game, selectedNode } = get()
          if (!game || selectedNode == null) return
          const move = movesTo(game, selectedNode).find((m) => m.ticket === ticket)
          if (move) applyPlayerMove(move)
        },

        cancelSelection: () => set({ selectedNode: null }),

        toggleDouble: () => {
          const { game } = get()
          if (!game || !canUseDouble(game)) return
          set((s) => ({ doubleArmed: !s.doubleArmed }))
        },

        toggleBelief: () => set((s) => ({ showBelief: !s.showBelief })),

        runAi: async () => {
          if (get().aiThinking) return
          set({ aiThinking: true })
          try {
            while (true) {
              const game = get().game
              if (!game || isGameOver(game) || isPlayerTurn(game)) break
              await delay(AI_DELAY)
              const current = get().game
              if (!current || isGameOver(current) || isPlayerTurn(current)) break
              const diff = current.config.difficulty
              if (current.phase === 'mrx') {
                const plan = planMrxTurn(current, diff)
                for (let i = 0; i < plan.moves.length; i++) {
                  const useDouble = plan.double && i === 0
                  const before = get().game
                  if (!before) break
                  set({ game: mrxTakeMove(before, plan.moves[i], useDouble) })
                  if (i < plan.moves.length - 1) await delay(AI_DELAY)
                }
              } else if (current.phase === 'detectives') {
                set({ game: detectiveTakeMove(current, chooseDetectiveMove(current, diff)) })
              }
            }
          } finally {
            set({ aiThinking: false })
          }
        },

        resumeIfNeeded: () => {
          const { game, aiThinking } = get()
          if (game && !isGameOver(game) && !isPlayerTurn(game) && !aiThinking) {
            void get().runAi()
          }
        }
      }
    },
    {
      name: 'find-mister-x',
      partialize: (s) => ({ game: s.game, showBelief: s.showBelief })
    }
  )
)
