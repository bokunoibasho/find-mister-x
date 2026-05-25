import { useState } from 'react'
import type { Difficulty, Role } from '../game/types'
import { useGameStore } from '../store/gameStore'

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'detective', label: '刑事チーム', desc: '隠れたミスターXを推理して追い詰める' },
  { value: 'mrx', label: 'ミスターX', desc: '刑事の包囲をかわして24ラウンド逃げ切る' }
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'やさしい' },
  { value: 'normal', label: 'ふつう' },
  { value: 'hard', label: 'むずかしい' }
]

export function StartScreen() {
  const newGame = useGameStore((s) => s.newGame)
  const [role, setRole] = useState<Role>('detective')
  const [count, setCount] = useState(4)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  return (
    <div className="start-screen">
      <div className="start-card">
        <h1 className="title">
          MISTER <span className="title-x">X</span> を探せ
        </h1>
        <p className="subtitle">スコットランドヤード風 追跡ゲーム</p>

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
            {[3, 4, 5].map((n) => (
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

        <button className="start-btn" onClick={() => newGame({ playerRole: role, detectiveCount: count, difficulty })}>
          ゲーム開始
        </button>
      </div>
    </div>
  )
}
