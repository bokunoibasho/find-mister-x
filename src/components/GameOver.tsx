import type { GameState } from '../game/types'
import { useGameStore } from '../store/gameStore'

export function GameOver({ game }: { game: GameState }) {
  const newGame = useGameStore((s) => s.newGame)
  const quit = useGameStore((s) => s.quit)

  const detectivesWon = game.phase === 'detective-win'
  const playerWon = detectivesWon === (game.config.playerRole === 'detective')

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2 className={playerWon ? 'win' : 'lose'}>{playerWon ? '勝利！' : '敗北…'}</h2>
        <p className="result-line">
          {detectivesWon
            ? `刑事がミスターXを ${game.mrx.position}番 で確保！`
            : `ミスターXが ${game.round} ラウンド逃げ切った！`}
        </p>
        <div className="overlay-actions">
          <button className="start-btn" onClick={() => newGame(game.config)}>
            もう一度
          </button>
          <button className="ghost-btn" onClick={quit}>
            メニューへ
          </button>
        </div>
      </div>
    </div>
  )
}
