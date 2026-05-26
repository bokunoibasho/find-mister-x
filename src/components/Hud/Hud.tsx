import { useEffect, useRef } from 'react'
import { canUseDouble } from '../../game/engine'
import { nextHiddenRound, nextRevealRound } from '../../game/rules'
import { movesTo } from '../../game/selectors'
import type { Detective, GameState, Ticket } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { TICKET_META } from '../../ui/theme'

const fmt = (n: number) => (n >= 99 ? '∞' : String(n))

function statusText(game: GameState, aiThinking: boolean): string {
  if (aiThinking) return 'AI 思考中…'
  if (game.phase === 'mrx') {
    return game.doubleInProgress ? 'ミスターX：2手目を選択' : 'ミスターXの番'
  }
  if (game.phase === 'detectives') return `${game.detectives[game.currentDetective].name}刑事の番`
  return ''
}

function revealText(game: GameState, mrxVisibleNow: boolean): string {
  if (game.mrxMostlyVisible) {
    if (!mrxVisibleNow) return 'ミスターX潜伏中 — 推理！'
    const n = nextHiddenRound(game.reveals, game.totalRounds, game.round)
    return n ? `次に隠れる：ラウンド ${n}` : 'もう隠れません'
  }
  const n = nextRevealRound(game.reveals, game.round)
  return n ? `次の浮上：ラウンド ${n}` : '浮上はもうありません'
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

  const isDetective = game.config.playerRole === 'detective'
  const lastEntry = game.log.length ? game.log[game.log.length - 1] : undefined
  const gameOver = game.phase === 'detective-win' || game.phase === 'mrx-win'
  const mrxVisibleNow = !isDetective || gameOver || lastEntry?.revealed != null

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
          <span>{revealText(game, mrxVisibleNow)}</span>
          {isDetective && !mrxVisibleNow && game.mrx.lastRevealed != null && (
            <span className="last-seen">最後の目撃：{game.mrx.lastRevealed}番</span>
          )}
        </div>

        <TravelLog game={game} />

        <ActiveActor game={game} />

        {isDetective && <DetectiveStrip game={game} />}

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

/** Big always-visible panel for the piece the human is about to control. */
function ActiveActor({ game }: { game: GameState }) {
  const isDetective = game.config.playerRole === 'detective'
  if (game.phase === 'detective-win' || game.phase === 'mrx-win') return null

  if (isDetective && game.phase === 'detectives') {
    const d = game.detectives[game.currentDetective]
    return (
      <div className="active-actor">
        <span className="det-dot" style={{ background: d.color }}>
          {d.name}
        </span>
        <span className="aa-label">刑事のチケット</span>
        <TicketChip ticket="taxi" count={d.tickets.taxi} />
        <TicketChip ticket="bus" count={d.tickets.bus} />
        {d.tickets.underground > 0 && <TicketChip ticket="underground" count={d.tickets.underground} />}
      </div>
    )
  }
  if (!isDetective && game.phase === 'mrx') {
    return (
      <div className="active-actor">
        <span className="det-dot" style={{ background: '#111827' }}>
          X
        </span>
        <span className="aa-label">ミスターX</span>
        <TicketChip ticket="black" count={game.mrx.tickets.black} />
        <span className="double-chip">2x ×{game.mrx.doubleRemaining}</span>
      </div>
    )
  }
  return <div className="active-actor waiting">相手の番…</div>
}

function DetectiveStrip({ game }: { game: GameState }) {
  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = activeRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ inline: 'nearest', block: 'nearest' })
      } catch {
        /* jsdom / unsupported */
      }
    }
  }, [game.currentDetective, game.phase])

  return (
    <div className="tickets-detectives">
      {game.detectives.map((d: Detective) => {
        const active = game.phase === 'detectives' && game.currentDetective === d.id
        return (
          <div key={d.id} ref={active ? activeRef : undefined} className={`det-card${active ? ' active' : ''}`}>
            <span className="det-dot sm" style={{ background: d.color }}>
              {d.name}
            </span>
            <TicketChip ticket="taxi" count={d.tickets.taxi} />
            <TicketChip ticket="bus" count={d.tickets.bus} />
            {d.tickets.underground > 0 && <TicketChip ticket="underground" count={d.tickets.underground} />}
          </div>
        )
      })}
    </div>
  )
}

function TicketChip({ ticket, count }: { ticket: Ticket; count: number }) {
  const meta = TICKET_META[ticket]
  return (
    <span className="ticket-chip" style={{ borderColor: meta.color }}>
      <span className="tc-dot" style={{ background: meta.color }} />
      {fmt(count)}
    </span>
  )
}

function TravelLog({ game }: { game: GameState }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [game.log.length])

  return (
    <div className="travel-log" ref={ref}>
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
