import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

const TAP_THRESHOLD = 6 // client px of movement before a gesture counts as a drag

export function usePanZoom(boardW: number, boardH: number) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [vb, setVb] = useState<ViewBox>({ x: 0, y: 0, w: boardW, h: boardH })
  const minW = boardW * 0.22
  const maxW = boardW * 1.1

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const draggedRef = useRef(false)
  const downPos = useRef<{ x: number; y: number } | null>(null)
  const pinchDist = useRef<number | null>(null)

  const clientToBoard = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = new DOMPoint(cx, cy)
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      setVb((cur) => {
        let newW = cur.w / factor
        if (newW < minW) newW = minW
        if (newW > maxW) newW = maxW
        const realFactor = cur.w / newW
        const newH = cur.h / realFactor
        const focal = (() => {
          const svg = svgRef.current
          if (!svg) return { x: cur.x + cur.w / 2, y: cur.y + cur.h / 2 }
          const pt = new DOMPoint(clientX, clientY)
          const ctm = svg.getScreenCTM()
          if (!ctm) return { x: cur.x + cur.w / 2, y: cur.y + cur.h / 2 }
          const p = pt.matrixTransform(ctm.inverse())
          return { x: p.x, y: p.y }
        })()
        return {
          x: focal.x - (focal.x - cur.x) / realFactor,
          y: focal.y - (focal.y - cur.y) / realFactor,
          w: newW,
          h: newH
        }
      })
    },
    [minW, maxW]
  )

  const onPointerDown = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      draggedRef.current = false
      downPos.current = { x: e.clientX, y: e.clientY }
    }
  }, [])

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const prev = pointers.current.get(e.pointerId)
      if (!prev) return
      const cur = { x: e.clientX, y: e.clientY }

      if (pointers.current.size === 2) {
        const ids = [...pointers.current.keys()]
        const a = pointers.current.get(ids[0])!
        const b = pointers.current.get(ids[1])!
        // update this pointer first
        pointers.current.set(e.pointerId, cur)
        const a2 = pointers.current.get(ids[0])!
        const b2 = pointers.current.get(ids[1])!
        const distBefore = Math.hypot(a.x - b.x, a.y - b.y)
        const distAfter = Math.hypot(a2.x - b2.x, a2.y - b2.y)
        const midX = (a2.x + b2.x) / 2
        const midY = (a2.y + b2.y) / 2
        if (pinchDist.current && distBefore > 0) {
          zoomAt(midX, midY, distAfter / distBefore)
        }
        pinchDist.current = distAfter
        draggedRef.current = true
        return
      }

      // single-pointer pan
      pointers.current.set(e.pointerId, cur)
      if (downPos.current) {
        const moved = Math.hypot(cur.x - downPos.current.x, cur.y - downPos.current.y)
        if (moved > TAP_THRESHOLD) draggedRef.current = true
      }
      if (!draggedRef.current) return
      const p0 = clientToBoard(prev.x, prev.y)
      const p1 = clientToBoard(cur.x, cur.y)
      setVb((v) => ({ ...v, x: v.x - (p1.x - p0.x), y: v.y - (p1.y - p0.y) }))
    },
    [clientToBoard, zoomAt]
  )

  const endPointer = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchDist.current = null
  }, [])

  const onWheel = useCallback(
    (e: ReactWheelEvent<SVGSVGElement>) => {
      e.preventDefault()
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12)
    },
    [zoomAt]
  )

  const reset = useCallback(() => setVb({ x: 0, y: 0, w: boardW, h: boardH }), [boardW, boardH])

  const centerOn = useCallback((x: number, y: number) => {
    setVb((v) => ({ ...v, x: x - v.w / 2, y: y - v.h / 2 }))
  }, [])

  return {
    svgRef,
    viewBox: vb,
    draggedRef,
    reset,
    centerOn,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onWheel
    }
  }
}
