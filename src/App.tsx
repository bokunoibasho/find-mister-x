import { useEffect } from 'react'
import { Board } from './components/Board/Board'
import { GameOver } from './components/GameOver'
import { Hud } from './components/Hud/Hud'
import { StartScreen } from './components/StartScreen'
import { isGameOver } from './game/engine'
import { useGameStore } from './store/gameStore'

export default function App() {
  const game = useGameStore((s) => s.game)
  const resumeIfNeeded = useGameStore((s) => s.resumeIfNeeded)

  useEffect(() => {
    resumeIfNeeded()
  }, [resumeIfNeeded])

  if (!game) return <StartScreen />

  return (
    <div className="game-screen">
      <Board game={game} />
      <Hud game={game} />
      {isGameOver(game) && <GameOver game={game} />}
    </div>
  )
}
