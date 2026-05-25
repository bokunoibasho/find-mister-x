import { useMemo } from 'react'
import { board, getNode } from '../../game/board'
import { computeBelief } from '../../game/ai/belief'
import { playerLegalMoves } from '../../game/selectors'
import type { GameState } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { EDGE_STYLE } from '../../ui/theme'
import { usePanZoom } from './usePanZoom'

function nodeRadius(kinds: string[]): number {
  if (kinds.includes('underground')) return 8.5
  if (kinds.includes('bus')) return 7
  return 5.5
}

function nodeStroke(kinds: string[]): string {
  if (kinds.includes('underground')) return '#ef4444'
  if (kinds.includes('bus')) return '#22c55e'
  return '#8b94a7'
}

export function Board({ game }: { game: GameState }) {
  const { svgRef, viewBox, draggedRef, bind, reset } = usePanZoom(board.meta.width, board.meta.height)
  const tapNode = useGameStore((s) => s.tapNode)
  const selectedNode = useGameStore((s) => s.selectedNode)
  const showBelief = useGameStore((s) => s.showBelief)

  const legalDest = useMemo(() => new Set(playerLegalMoves(game).map((m) => m.to)), [game])
  const belief = useMemo(() => {
    if (!showBelief || game.config.playerRole !== 'detective') return null
    return computeBelief(game)
  }, [game, showBelief])

  const mrxVisible = game.config.playerRole === 'mrx' || game.phase === 'mrx-win' || game.phase === 'detective-win'

  return (
    <div className="board-wrap">
      <svg
        ref={svgRef}
        className="board-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        {...bind}
      >
        <rect
          x={-2000}
          y={-2000}
          width={board.meta.width + 4000}
          height={board.meta.height + 4000}
          fill="#0b1020"
        />

        {/* edges */}
        <g>
          {board.edges.map((e, i) => {
            const a = getNode(e.a)
            const b = getNode(e.b)
            const s = EDGE_STYLE[e.type]
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={s.color}
                strokeWidth={s.width}
                strokeDasharray={s.dash}
                opacity={s.opacity}
                strokeLinecap="round"
              />
            )
          })}
        </g>

        {/* belief overlay */}
        {belief && (
          <g>
            {[...belief].map((id) => {
              const n = getNode(id)
              return <circle key={`b${id}`} cx={n.x} cy={n.y} r={13} fill="#f59e0b" opacity={0.18} />
            })}
          </g>
        )}

        {/* stations */}
        <g>
          {board.nodes.map((n) => {
            const isDest = legalDest.has(n.id)
            const isSelected = selectedNode === n.id
            return (
              <g key={n.id} onClick={() => !draggedRef.current && tapNode(n.id)} style={{ cursor: isDest ? 'pointer' : 'default' }}>
                {isDest && <circle cx={n.x} cy={n.y} r={14} className="dest-ring" />}
                {isSelected && <circle cx={n.x} cy={n.y} r={16} className="sel-ring" />}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={nodeRadius(n.kinds)}
                  fill="#eef2f8"
                  stroke={nodeStroke(n.kinds)}
                  strokeWidth={1.6}
                />
                <text x={n.x} y={n.y + 3} className="station-label">
                  {n.id}
                </text>
              </g>
            )
          })}
        </g>

        {/* Mr X last-seen marker (for detective player) */}
        {game.config.playerRole === 'detective' && game.mrx.lastRevealed != null && !mrxVisible && (
          <g pointerEvents="none">
            <circle
              cx={getNode(game.mrx.lastRevealed).x}
              cy={getNode(game.mrx.lastRevealed).y}
              r={13}
              fill="none"
              stroke="#111827"
              strokeWidth={2.5}
              strokeDasharray="4 3"
            />
          </g>
        )}

        {/* pieces */}
        <g pointerEvents="none">
          {mrxVisible && <Piece x={getNode(game.mrx.position).x} y={getNode(game.mrx.position).y} color="#111827" label="X" big />}
          {game.detectives.map((d) => {
            const n = getNode(d.position)
            const active = game.phase === 'detectives' && game.currentDetective === d.id && game.config.playerRole === 'detective'
            return <Piece key={d.id} x={n.x} y={n.y} color={d.color} label={d.name} active={active} />
          })}
        </g>
      </svg>

      <button className="reset-view" onClick={reset} aria-label="表示をリセット">
        ⤢
      </button>
    </div>
  )
}

function Piece({
  x,
  y,
  color,
  label,
  big,
  active
}: {
  x: number
  y: number
  color: string
  label: string
  big?: boolean
  active?: boolean
}) {
  const r = big ? 13 : 11
  return (
    <g>
      {active && <circle cx={x} cy={y} r={r + 5} className="active-pulse" />}
      <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={2.5} />
      <text x={x} y={y + 4} className="piece-label">
        {label}
      </text>
    </g>
  )
}
