export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="howto-card" onClick={(e) => e.stopPropagation()}>
        <h2>あそびかた</h2>

        <h3>目的</h3>
        <p>
          刑事は、逃げる「ミスターX」と同じ駅に入れば勝ち。ミスターXは、最後のラウンドまで
          捕まらずに逃げ切れば勝ちです。
        </p>

        <h3>移動</h3>
        <p>
          自分の駒を動かせる駅が光ります。駅をタップして移動。複数の行き方（交通手段）が
          ある時は選びます。
        </p>
        <ul className="howto-legend">
          <li>
            <span className="legend-line" style={{ background: '#cbd5e1' }} />タクシー（近く）
          </li>
          <li>
            <span className="legend-line" style={{ background: '#34d399' }} />バス（少し遠く）
          </li>
          <li>
            <span className="legend-line" style={{ background: '#f87171' }} />地下鉄（遠く・クラシックのみ）
          </li>
        </ul>

        <h3>ミスターXの居場所</h3>
        <p>
          ミスターXは普段かくれています。決まったラウンドだけ姿を現します（移動の記録＝使った
          交通手段が下に並ぶので、それを手がかりに推理）。「推理補助」をオンにすると、いそうな
          駅が地図に表示されます。
        </p>
        <p className="howto-note">
          ビギナーでは、ミスターXはほとんど見えていて、隠れるのは数回だけ。まずはこちらがおすすめです。
        </p>

        <h3>ミスターXの特殊手</h3>
        <p>
          黒チケット（使った交通手段を隠す）と、ダブルムーブ（1ターンに2回動く）を数回だけ使えます。
        </p>

        <button className="start-btn" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  )
}
