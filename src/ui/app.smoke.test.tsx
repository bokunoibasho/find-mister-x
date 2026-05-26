// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { useGameStore } from '../store/gameStore'

afterEach(() => {
  cleanup()
  useGameStore.getState().quit()
  localStorage.clear()
})

describe('App smoke test (jsdom)', () => {
  it('renders the start screen', () => {
    render(<App />)
    expect(screen.getByText('ゲーム開始')).toBeTruthy()
    expect(screen.getByText('刑事チーム')).toBeTruthy()
    expect(screen.getByText('ミスターX')).toBeTruthy()
  })

  it('starts a Mr X game and renders the board + HUD without crashing', () => {
    render(<App />)
    fireEvent.click(screen.getByText('ミスターX'))
    fireEvent.click(screen.getByText('ゲーム開始'))

    expect(document.querySelector('svg.board-svg')).toBeTruthy()
    // beginner board (~45 stations) each rendered with a hit + base circle, plus pieces
    expect(document.querySelectorAll('svg.board-svg circle').length).toBeGreaterThan(80)
    // HUD shows the round counter and Mr X's turn (beginner default = 13 rounds)
    expect(screen.getByText('/ 13')).toBeTruthy()
    expect(screen.getByText('ミスターXの番')).toBeTruthy()
    // Mr X controls: double-move button present
    expect(screen.getByText(/ダブルムーブ/)).toBeTruthy()
  })
})
