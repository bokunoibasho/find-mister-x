import { useState } from 'react'
import { MODE_PRESETS } from '../game/presets'
import type { Difficulty, Mode, Role } from '../game/types'
import { useGameStore } from '../store/gameStore'
import { HowToPlay } from './HowToPlay'

const MODES: { value: Mode; label: string; desc: string }[] = [
  { value: 'beginner', label: 'ビギナー', desc: '小さな地図・短い試合。ミスターXはほぼ見える。初めての人向け。' },
  { value: 'classic', label: 'クラシック', desc: '本格ロンドン(199駅)。ミスターXはほぼ隠れる。歯ごたえ重視。' }
]

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'detective', label: '刑事チーム', desc: '隠れたミスターXを推理して追い詰める' },
  { value: 'mrx', label: 'ミスターX', desc: '刑事の包囲をかわして逃げ切る' }
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'やさしい' },
  { value: 'normal', label: 'ふつう' },
  { value: 'hard', label: 'むずかしい' }
]

export function StartScreen() {
  const newGame = useGameStore((s) => s.newGame)
  const [mode, setMode] = useState<Mode>('beginner')
  const [role, setRole] = useState<Role>('detective')
  const [count, setCount] = useState(MODE_PRESETS.beginner.defaultDetectives)
  const [difficulty, setDifficulty] = useState<Difficulty>(MODE_PRESETS.beginner.defaultDifficulty)
  const [showHelp, setShowHelp] = useState(false)

  const preset = MODE_PRESETS[mode]

  function changeMode(m: Mode) {
    setMode(m)
    setCount(MODE_PRESETS[m].defaultDetectives)
    setDifficulty(MODE_PRESETS[m].defaultDifficulty)
  }

  return (
    <div className="start-screen">
      <div className="start-card">
        <h1 className="title">
          MISTER <span className="title-x">X</span> を探せ
        </h1>
        <p className="subtitle">スコットランドヤード風 追跡ゲーム</p>

        <section>
          <h2>モード</h2>
          <div className="opt-grid">
            {MODES.map((m) => (
              <button
                key={m.value}
                className={`opt-card${mode === m.value ? ' selected' : ''}`}
                onClick={() => changeMode(m.value)}
              >
                <span className="opt-label">{m.label}</span>
                <span className="opt-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>あなたの役割</h2>
          <div className="opt-grid">
            {ROLES.map((r) => (
              <button
                key={r.value}
                className={`opt-card${role === r.value ? ' selected' : ''}`}
                onClick={() => setRole(r.value)}
              >
                <span className="opt-label">{r.label}</span>
                <span className="opt-desc">{r.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>刑事の人数</h2>
          <div className="seg">
            {preset.detectiveCounts.map((n) => (
              <button key={n} className={`seg-btn${count === n ? ' selected' : ''}`} onClick={() => setCount(n)}>
                {n}人
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>難易度</h2>
          <div className="seg">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                className={`seg-btn${difficulty === d.value ? ' selected' : ''}`}
                onClick={() => setDifficulty(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        <button
          className="start-btn"
          onClick={() => newGame({ playerRole: role, detectiveCount: count, difficulty, mode })}
        >
          ゲーム開始
        </button>
        <button className="ghost-btn helpbtn" onClick={() => setShowHelp(true)}>
          あそびかた
        </button>
      </div>

      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  )
}
