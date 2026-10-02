'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DataPacket_Kind, RoomEvent, type Room } from 'livekit-client'
import { Eraser, Pencil, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A shared drawing surface, synced over LiveKit's data channel.
 *
 * Strokes go out as data packets on the connection the call is already using,
 * so this costs no extra service and no extra round trip — which matters at
 * ₹99 a seat. Points are normalised to 0–1 before sending, so a mentor drawing
 * on a laptop lands in the right place on a student's phone whatever the
 * canvas size.
 *
 * Reliable delivery, not lossy: a dropped stroke leaves a gap in someone's
 * drawing that never heals, and the volume here is tiny.
 */

type Point = { x: number; y: number }
type Stroke = { id: string; by: string; colour: string; width: number; points: Point[] }
type Message =
  | { t: 'stroke'; stroke: Stroke }
  | { t: 'clear' }
  | { t: 'undo'; by: string }
  | { t: 'sync'; strokes: Stroke[] }

const COLOURS = ['#0B1A3D', '#0069EE', '#C5372C', '#1A7A43', '#9C6408']
const WIDTHS = [2, 4, 8]

export function Whiteboard({
  room,
  canDraw,
  className,
}: {
  room: Room
  canDraw: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const drawingRef = useRef<Stroke | null>(null)
  const [colour, setColour] = useState(COLOURS[1]!)
  const [width, setWidth] = useState(4)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')

  const me = room.localParticipant.identity

  /* ---- painting ---------------------------------------------------------- */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { width: w, height: h } = canvas
    ctx.clearRect(0, 0, w, h)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const all = drawingRef.current
      ? [...strokesRef.current, drawingRef.current]
      : strokesRef.current

    for (const s of all) {
      if (s.points.length < 2) continue
      ctx.strokeStyle = s.colour
      // Scale the pen with the canvas so a 4px line is 4px-ish everywhere.
      ctx.lineWidth = s.width * (w / 1000)
      ctx.beginPath()
      ctx.moveTo(s.points[0]!.x * w, s.points[0]!.y * h)
      for (const p of s.points.slice(1)) ctx.lineTo(p.x * w, p.y * h)
      ctx.stroke()
    }
  }, [])

  /* ---- keep the bitmap matched to its box ------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      redraw()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [redraw])

  /* ---- receiving --------------------------------------------------------- */
  const send = useCallback(
    (msg: Message) => {
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { reliable: true, topic: 'whiteboard' }
      )
    },
    [room]
  )

  useEffect(() => {
    const onData = (payload: Uint8Array, _p?: unknown, _k?: DataPacket_Kind, topic?: string) => {
      if (topic !== 'whiteboard') return
      let msg: Message
      try {
        msg = JSON.parse(new TextDecoder().decode(payload))
      } catch {
        return
      }

      if (msg.t === 'stroke') strokesRef.current = [...strokesRef.current, msg.stroke]
      else if (msg.t === 'clear') strokesRef.current = []
      else if (msg.t === 'undo') {
        const last = [...strokesRef.current].reverse().find((s) => s.by === msg.by)
        if (last) strokesRef.current = strokesRef.current.filter((s) => s.id !== last.id)
      } else if (msg.t === 'sync' && strokesRef.current.length === 0) {
        // Someone joined late and asked; take the first answer only.
        strokesRef.current = msg.strokes
      }
      redraw()
    }

    const onJoin = () => {
      // Catch a late joiner up. Everyone replies, and the receiver ignores all
      // but the first, which is cheaper than electing a single authority.
      if (strokesRef.current.length) send({ t: 'sync', strokes: strokesRef.current })
    }

    room.on(RoomEvent.DataReceived, onData)
    room.on(RoomEvent.ParticipantConnected, onJoin)
    return () => {
      room.off(RoomEvent.DataReceived, onData)
      room.off(RoomEvent.ParticipantConnected, onJoin)
    }
  }, [room, redraw, send])

  /* ---- drawing ----------------------------------------------------------- */
  const pointFrom = (e: React.PointerEvent): Point => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = {
      id: crypto.randomUUID(),
      by: me,
      // The eraser is a white pen, which is enough on a white board and keeps
      // the data model to one kind of thing.
      colour: tool === 'eraser' ? '#FFFFFF' : colour,
      width: tool === 'eraser' ? 24 : width,
      points: [pointFrom(e)],
    }
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current.points.push(pointFrom(e))
    redraw()
  }

  const end = () => {
    const stroke = drawingRef.current
    drawingRef.current = null
    if (!stroke || stroke.points.length < 2) return
    strokesRef.current = [...strokesRef.current, stroke]
    send({ t: 'stroke', stroke })
    redraw()
  }

  const clear = () => {
    strokesRef.current = []
    redraw()
    send({ t: 'clear' })
  }

  const undo = () => {
    const last = [...strokesRef.current].reverse().find((s) => s.by === me)
    if (!last) return
    strokesRef.current = strokesRef.current.filter((s) => s.id !== last.id)
    redraw()
    send({ t: 'undo', by: me })
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className={cn(
          'min-h-0 flex-1 rounded-[var(--radius-md)] bg-white',
          canDraw ? 'cursor-crosshair touch-none' : 'cursor-default'
        )}
        aria-label={canDraw ? 'Shared whiteboard. Draw with a pointer or stylus.' : 'Shared whiteboard'}
      />

      {canDraw && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-black/25 p-2">
          <div className="flex gap-1">
            {COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setColour(c); setTool('pen') }}
                aria-label={`Pen colour ${c}`}
                aria-pressed={tool === 'pen' && colour === c}
                className={cn(
                  'size-6 rounded-full border-2 transition-transform',
                  tool === 'pen' && colour === c
                    ? 'scale-110 border-white'
                    : 'border-white/30'
                )}
                style={{ background: c }}
              />
            ))}
          </div>

          <div className="flex gap-1">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => { setWidth(w); setTool('pen') }}
                aria-label={`Pen width ${w}`}
                aria-pressed={tool === 'pen' && width === w}
                className={cn(
                  'flex size-7 items-center justify-center rounded-[var(--radius-sm)]',
                  tool === 'pen' && width === w ? 'bg-white/25' : 'hover:bg-white/10'
                )}
              >
                <span className="rounded-full bg-white" style={{ width: w + 2, height: w + 2 }} />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
            aria-pressed={tool === 'eraser'}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-semibold text-white',
              tool === 'eraser' ? 'bg-white/25' : 'hover:bg-white/10'
            )}
          >
            {tool === 'eraser' ? <Eraser className="size-3.5" /> : <Pencil className="size-3.5" />}
            {tool === 'eraser' ? 'Eraser' : 'Pen'}
          </button>

          <button
            type="button"
            onClick={undo}
            className="ml-auto flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            <Undo2 className="size-3.5" /> Undo
          </button>
          <button
            type="button"
            onClick={clear}
            className="flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-semibold text-white hover:bg-danger"
          >
            <Trash2 className="size-3.5" /> Clear
          </button>
        </div>
      )}
    </div>
  )
}
