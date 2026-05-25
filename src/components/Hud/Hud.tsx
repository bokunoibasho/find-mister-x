import { canUseDouble } from '../../game/engine'
import { nextRevealRound } from '../../game/rules'
import { movesTo } from '../../game/selectors'
import type { GameState, Ticket } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { TICKET_META } from '../../ui/theme'

function statusText(game: GameState, aiThinking: boolean): string {
  if (aiThinking) return 'AI 思考中…'
  if (game.phase === 'mrx') {
    if (game.config.playerRole === 'mrx') {
      return game.doubleInProgress ? 'ミスターX：2手目を選択' : 'ミスターXの番'
    }
    return 'ミスターXの番'
  }
  if (game.phase === 'detectives') {
    const det = game.detectives[game.currentDetective]
    return `${det.name}刑事の番`
  }
  return ''
}

export function Hud({ game }: { game: GameState }) {
  const aiThinking = useGameStore((s) => s.aiThinking)
  const selectedNode = useGameStore((s) => s.selectedNode)
  const doubleArmed = useGameStore((s) => s.doubleArmed)
  const showBelief = useGameStore((s) => s.showBelief)
  const toggleDouble = useGameStore((s) => s.toggleDouble)
  const toggleBelief = useGameStore((s) => s.toggleBelief)
  const chooseTicket = useGameStore((s) => s.chooseTicket)
  const cancelSelection = useGameStore((s) => s.cancelSelection)
  const quit = useGameStore((s) => s.quit)

  const reveal = nextRevealRound(game.round)
  const isDetective = game.config.playerRole === 'detective'

  return (
    <>
      <div className="hud-top">
        <div className="hud-round">
          <span className="round-num">{game.round}</span>
          <span className="round-tot">/ {game.totalRounds}</span>
        </div>
        <div className="hud-status">{statusText(game, aiThinking)}</div>
        <button className="hud-menu" onClick={quit} aria-label="メニュー">
          ☰
        </button>
      </div>

      <div className="hud-bottom">
        <div className="reveal-line">
          {reveal ? <>次の浮上：ラウンド {reveal}</> : <>浮上はもうありません</>}
          {isDetective && game.mrx.lastRevealed != null && (
            <span className="last-seen">最後の目撃：{game.mrx.lastRevealed}番</span>
          )}
        </div>

        <TravelLog game={game} />

        {isDetective ? (
          <div className="tickets-detectives">
            {game.detectives.map((d) => {
              const active = game.phase === 'detectives' && game.currentDetective === d.id
              return (
                <div key={d.id} className={`det-card${active ? ' active' : ''}`}>
                  <span className="det-dot" style={{ background: d.color }}>
                    {d.name}
                  </span>
                  <TicketChip ticket="taxi" count={d.tickets.taxi} />
                  <TicketChip ticket="bus" count={d.tickets.bus} />
                  <TicketChip ticket="underground" count={d.tickets.underground} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="tickets-mrx">
            <TicketChip ticket="black" count={game.mrx.tickets.black} />
            <div className="double-chip">2x ×{game.mrx.doubleRemaining}</div>
          </div>
        )}

        <div className="hud-actions">
          {!isDetective && (
            <button
              className={`act-btn${doubleArmed ? ' on' : ''}`}
              disabled={!canUseDouble(game) || aiThinking}
              onClick={toggleDouble}
            >
              ダブルムーブ {doubleArmed ? 'ON' : ''}
            </button>
          )}
          {isDetective && (
            <button className={`act-btn${showBelief ? ' on' : ''}`} onClick={toggleBelief}>
              推理補助 {showBelief ? 'ON' : 'OFF'}
            </button>
          )}
        </div>
      </div>

      {selectedNode != null && (
        <div className="ticket-picker-backdrop" onClick={cancelSelection}>
          <div className="ticket-picker" onClick={(e) => e.stopPropagation()}>
            <div className="tp-title">{selectedNode}番へ — チケットを選択</div>
            <div className="tp-options">
              {[...new Set(movesTo(game, selectedNode).map((m) => m.ticket))].map((t) => (
                <button
                  key={t}
                  className="tp-btn"
                  style={{ borderColor: TICKET_META[t].color }}
                  onClick={() => chooseTicket(t)}
                >
                  <span className="tp-dot" style={{ background: TICKET_META[t].color }} />
                  {TICKET_META[t].label}
                </button>
              ))}
            </div>
            <button className="tp-cancel" onClick={cancelSelection}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function TicketChip({ ticket, count }: { ticket: Ticket; count: number }) {
  const meta = TICKET_META[ticket]
  return (
    <span className="ticket-chip" style={{ borderColor: meta.color }}>
      <span className="tc-dot" style={{ background: meta.color }} />
      {count}
    </span>
  )
}

function TravelLog({ game }: { game: GameState }) {
  return (
    <div className="travel-log">
      {game.log.length === 0 && <span className="tl-empty">ミスターXの移動記録</span>}
      {game.log.map((e, i) => {
        const meta = TICKET_META[e.ticket]
        return (
          <span key={i} className="tl-entry" title={`ラウンド${e.round}`}>
            <span className="tl-round">{e.round}</span>
            <span className="tl-tk" style={{ background: meta.color }}>
              {meta.short}
            </span>
            {e.revealed != null && <span className="tl-reveal">{e.revealed}</span>}
          </span>
        )
      })}
    </div>
  )
}
