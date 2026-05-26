import { useEffect, useMemo, useRef } from 'react'
import { computeBelief } from '../../game/ai/belief'
import { STATION_COUNT, activeMapId, board, getNode } from '../../game/board'
import { playerLegalMoves } from '../../game/selectors'
import type { EdgeType, GameState } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { EDGE_HALO, EDGE_LABEL, EDGE_STYLE } from '../../ui/theme'
import { usePanZoom } from './usePanZoom'

const EDGE_ORDER: EdgeType[] = ['taxi', 'ferry', 'bus', 'underground']

function Board({ game }: { game: GameState }) {
  const { svgRef, viewBox, draggedRef, bind, reset, centerOn } = usePanZoom(
    board.meta.width,
    board.meta.height
  )
  const tapNode = useGameStore((s) => s.tapNode)
  const selectedNode = useGameStore((s) => s.selectedNode)
  const showBelief = useGameStore((s) => s.showBelief)

  const mapId = activeMapId()
  const scale = STATION_COUNT < 80 ? 1.7 : 1
  const labelsAlways = STATION_COUNT < 80
  const labelsByZoom = viewBox.w < board.meta.width * 0.55

  const legalDest = useMemo(() => new Set(playerLegalMoves(game).map((m) => m.to)), [game])

  const gameOver = game.phase === 'detective-win' || game.phase === 'mrx-win'
  const lastEntry = game.log.length ? game.log[game.log.length - 1] : undefined
  const mrxVisibleNow = game.config.playerRole === 'mrx' || gameOver || lastEntry?.revealed != null

  const belief = useMemo(() => {
    if (!showBelief || game.config.playerRole !== 'detective' || mrxVisibleNow) return null
    return computeBelief(game)
  }, [game, showBelief, mrxVisibleNow])

  // Follow Mr X to the map whenever he surfaces.
  const prevRevealed = useRef<number | null>(game.mrx.lastRevealed)
  useEffect(() => {
    const lr = game.mrx.lastRevealed
    if (lr != null && lr !== prevRevealed.current) {
      const n = getNode(lr)
      centerOn(n.x, n.y)
    }
    prevRevealed.current = lr
  }, [game.mrx.lastRevealed, centerOn])

  // --- Static layers (do not depend on game state) ---
  const background = useMemo(() => {
    const river = board.meta.river
    const path = river ? 'M ' + river.points.map((p) => `${p[0]} ${p[1]}`).join(' L ') : ''
    return (
      <g key="bg">
        <rect
          x={-3000}
          y={-3000}
          width={board.meta.width + 6000}
          height={board.meta.height + 6000}
          fill="#0c1322"
        />
        {river && (
          <>
            <path d={path} fill="none" stroke="#16314f" strokeWidth={river.width + 8} strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="#1f4c79" strokeWidth={river.width} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </g>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId])

  const edges = useMemo(() => {
    const els: JSX.Element[] = []
    for (const type of EDGE_ORDER) {
      const s = EDGE_STYLE[type]
      for (const e of board.edges) {
        if (e.type !== type) continue
        const a = getNode(e.a)
        const b = getNode(e.b)
        if (type !== 'taxi') {
          els.push(
            <line key={`h${e.a}-${e.b}-${type}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={EDGE_HALO} strokeWidth={s.width + 1.8} strokeLinecap="round" />
          )
        }
        els.push(
          <line
            key={`e${e.a}-${e.b}-${type}`}
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
      }
    }
    return <g key="edges">{els}</g>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId])

  const baseNodes = useMemo(() => {
    return (
      <g key="nodes">
        {board.nodes.map((n) => {
          const r = (n.kinds.includes('underground') ? 8.5 : n.kinds.includes('bus') ? 7 : 5.5) * scale
          const stroke = n.kinds.includes('underground')
            ? '#ef4444'
            : n.kinds.includes('bus')
              ? '#22c55e'
              : '#94a3b8'
          return (
            <g key={n.id} onClick={() => !draggedRef.current && tapNode(n.id)}>
              <circle cx={n.x} cy={n.y} r={Math.max(15 * scale, r + 7)} fill="transparent" />
              <circle cx={n.x} cy={n.y} r={r} fill="#eef2f8" stroke={stroke} strokeWidth={2 * scale} />
            </g>
          )
        })}
      </g>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId])

  return (
    <div className="board-wrap">
      <svg
        ref={svgRef}
        className="board-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        {...bind}
      >
        {background}
        {edges}

        {belief && (
          <g pointerEvents="none">
            {[...belief].map((id) => {
              const n = getNode(id)
              return <circle key={`b${id}`} cx={n.x} cy={n.y} r={14 * scale} fill="#f59e0b" opacity={0.2} />
            })}
          </g>
        )}

        {baseNodes}

        {/* highlights + labels (dynamic) */}
        <g pointerEvents="none">
          {board.nodes.map((n) => {
            const isDest = legalDest.has(n.id)
            const isSelected = selectedNode === n.id
            const showLabel = labelsAlways || labelsByZoom || isDest || isSelected
            return (
              <g key={n.id}>
                {isDest && <circle cx={n.x} cy={n.y} r={13 * scale} className="dest-ring" />}
                {isSelected && <circle cx={n.x} cy={n.y} r={15 * scale} className="sel-ring" />}
                {showLabel && (
                  <text x={n.x} y={n.y + 3 * scale} className="station-label" style={{ fontSize: 6.5 * scale }}>
                    {n.id}
                  </text>
                )}
              </g>
            )
          })}
        </g>

        {/* Mr X last-seen marker for detective view */}
        {game.config.playerRole === 'detective' && !mrxVisibleNow && game.mrx.lastRevealed != null && (
          <g pointerEvents="none">
            <circle
              cx={getNode(game.mrx.lastRevealed).x}
              cy={getNode(game.mrx.lastRevealed).y}
              r={13 * scale}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={2.5}
              strokeDasharray="5 4"
            />
          </g>
        )}

        {/* pieces */}
        <g pointerEvents="none">
          {mrxVisibleNow && (
            <Piece x={getNode(game.mrx.position).x} y={getNode(game.mrx.position).y} color="#111827" label="X" scale={scale} big />
          )}
          {game.detectives.map((d) => {
            const n = getNode(d.position)
            const active =
              game.phase === 'detectives' &&
              game.currentDetective === d.id &&
              game.config.playerRole === 'detective'
            return <Piece key={d.id} x={n.x} y={n.y} color={d.color} label={d.name} scale={scale} active={active} />
          })}
        </g>
      </svg>

      <Legend showBelief={showBelief && game.config.playerRole === 'detective'} />

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
  scale,
  big,
  active
}: {
  x: number
  y: number
  color: string
  label: string
  scale: number
  big?: boolean
  active?: boolean
}) {
  const r = (big ? 12 : 10.5) * scale
  return (
    <g>
      {active && <circle cx={x} cy={y} r={r + 4} className="active-ring" />}
      <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={2.5 * scale} />
      <text x={x} y={y + 4 * scale} className="piece-label" style={{ fontSize: 11 * scale }}>
        {label}
      </text>
    </g>
  )
}

function Legend({ showBelief }: { showBelief: boolean }) {
  const counts = board.meta.counts
  const lines: EdgeType[] = ['taxi', 'bus']
  if (counts.underground) lines.push('underground')
  if (counts.ferry) lines.push('ferry')
  return (
    <div className="legend">
      {lines.map((t) => (
        <span key={t} className="legend-item">
          <span className="legend-line" style={{ background: EDGE_STYLE[t].color }} />
          {EDGE_LABEL[t]}
        </span>
      ))}
      <span className="legend-item">
        <span className="legend-dot" style={{ background: '#111827', borderColor: '#fff' }} />X
      </span>
      {showBelief && (
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#f59e0b' }} />候補
        </span>
      )}
    </div>
  )
}

export { Board }
