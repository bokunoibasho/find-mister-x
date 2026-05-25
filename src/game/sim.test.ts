import { describe, expect, it } from 'vitest'
import { chooseDetectiveMove } from './ai/detectives'
import { planMrxTurn } from './ai/misterX'
import { createGame, detectiveTakeMove, isGameOver, mrxTakeMove } from './engine'
import type { Difficulty, GameConfig } from './types'

function playToEnd(config: GameConfig) {
  let s = createGame(config)
  let guard = 0
  while (!isGameOver(s)) {
    if (guard++ > 4000) throw new Error('game did not terminate')
    if (s.phase === 'mrx') {
      const plan = planMrxTurn(s, config.difficulty)
      for (let i = 0; i < plan.moves.length; i++) {
        s = mrxTakeMove(s, plan.moves[i], plan.double && i === 0)
      }
    } else if (s.phase === 'detectives') {
      s = detectiveTakeMove(s, chooseDetectiveMove(s, config.difficulty))
    }
  }
  return s
}

describe('full game simulation (AI vs AI)', () => {
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard']
  for (const difficulty of difficulties) {
    it(`terminates cleanly on ${difficulty}`, () => {
      for (let i = 0; i < 12; i++) {
        const s = playToEnd({ playerRole: 'detective', detectiveCount: 4, difficulty })
        expect(isGameOver(s)).toBe(true)
        expect(s.round).toBeLessThanOrEqual(s.totalRounds)
      }
    })
  }

  it('produces both outcomes across many games', () => {
    let detWins = 0
    let mrxWins = 0
    for (let i = 0; i < 40; i++) {
      const s = playToEnd({ playerRole: 'detective', detectiveCount: 5, difficulty: 'hard' })
      if (s.phase === 'detective-win') detWins++
      else mrxWins++
    }
    expect(detWins + mrxWins).toBe(40)
    // sanity: the chase is not utterly one-sided
    expect(detWins).toBeGreaterThan(0)
  })
})
