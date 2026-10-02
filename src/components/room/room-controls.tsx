'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronUp, Mic, MicOff, MonitorUp, MonitorX, PenLine, PhoneOff,
  ScreenShare, Users, Video, VideoOff,
} from 'lucide-react'
import type { Room } from 'livekit-client'
import { cn } from '@/lib/utils'

/**
 * The controls along the bottom of the room.
 *
 * LiveKit ships a ControlBar and it was what this used, but it brings its own
 * look and its own labels, so the most-used screen in the product was the one
 * that looked least like the product. These are the same actions in our own
 * shell: big enough to hit on a phone, labelled, and with the state obvious
 * without reading — a muted mic is red and crossed out, not a subtly different
 * shade of grey.
 */

interface Dev {
  deviceId: string
  label: string
}

function ControlButton({
  on, onClick, label, Icon, OffIcon, danger, highlight, disabled,
}: {
  on: boolean
  onClick: () => void
  label: string
  Icon: typeof Mic
  OffIcon?: typeof MicOff
  /** Off is the alarming state (mic, camera) rather than the neutral one. */
  danger?: boolean
  /** On is the notable state (sharing, annotating). */
  highlight?: boolean
  disabled?: boolean
}) {
  const Show = !on && OffIcon ? OffIcon : Icon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        'flex min-w-[4.25rem] flex-col items-center gap-1 rounded-[var(--radius-md)] px-3 py-2 text-[0.6875rem] font-semibold transition-colors disabled:opacity-40',
        danger && !on && 'bg-danger text-white hover:bg-danger/90',
        highlight && on && 'bg-cta-group text-cta-group-foreground',
        !(danger && !on) && !(highlight && on) && 'text-white hover:bg-white/15'
      )}
    >
      <Show className="size-5" aria-hidden />
      {label}
    </button>
  )
}

export function RoomControls({
  room, micOn, camOn, sharing, annotating, canAnnotate, onMic, onCam, onShare,
  onAnnotate, onLeave, onParticipants, participants, screenShareActive,
}: {
  room: Room
  micOn: boolean
  camOn: boolean
  sharing: boolean
  annotating: boolean
  canAnnotate: boolean
  onMic: () => void
  onCam: () => void
  onShare: () => void
  onAnnotate: () => void
  onLeave: () => void
  onParticipants: () => void
  participants: number
  /** Somebody is sharing — annotation only makes sense then. */
  screenShareActive: boolean
}) {
  const [devices, setDevices] = useState<{ cams: Dev[]; mics: Dev[] }>({ cams: [], mics: [] })
  const [picker, setPicker] = useState<'cam' | 'mic' | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  // Labels are empty until permission is granted, so this runs after joining.
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices()
        if (!live) return
        setDevices({
          cams: all.filter((d) => d.kind === 'videoinput')
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
          mics: all.filter((d) => d.kind === 'audioinput')
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
        })
      } catch {
        /* a browser that will not enumerate is still usable */
      }
    })()
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (!picker) return
    const away = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setPicker(null)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [picker])

  async function pick(kind: 'cam' | 'mic', deviceId: string) {
    setPicker(null)
    try {
      await room.switchActiveDevice(kind === 'cam' ? 'videoinput' : 'audioinput', deviceId)
    } catch {
      /* the device vanished between listing and choosing */
    }
  }

  const list = picker === 'cam' ? devices.cams : devices.mics

  return (
    <div ref={wrap} className="relative">
      {picker && list.length > 0 && (
        <div className="absolute bottom-full left-1/2 z-40 mb-2 w-64 -translate-x-1/2 overflow-hidden rounded-[var(--radius-md)] border border-white/15 bg-[var(--navy-900)] p-1 shadow-xl">
          <p className="px-2 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wide text-white/50">
            {picker === 'cam' ? 'Camera' : 'Microphone'}
          </p>
          {list.map((d) => (
            <button
              key={d.deviceId}
              type="button"
              onClick={() => void pick(picker, d.deviceId)}
              className="block w-full truncate rounded-[var(--radius-sm)] px-2 py-2 text-left text-xs font-medium text-white hover:bg-white/10"
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end justify-center gap-1 rounded-[var(--radius-lg)] bg-black/40 p-1.5 backdrop-blur">
        <div className="relative flex items-end">
          <ControlButton
            on={micOn} onClick={onMic} label={micOn ? 'Mute' : 'Unmute'}
            Icon={Mic} OffIcon={MicOff} danger
          />
          {devices.mics.length > 1 && (
            <button
              type="button"
              onClick={() => setPicker(picker === 'mic' ? null : 'mic')}
              aria-label="Choose microphone"
              className="mb-1 -ml-2 rounded-full p-1 text-white/70 hover:bg-white/15 hover:text-white"
            >
              <ChevronUp className="size-3.5" aria-hidden />
            </button>
          )}
        </div>

        <div className="relative flex items-end">
          <ControlButton
            on={camOn} onClick={onCam} label={camOn ? 'Camera' : 'Camera off'}
            Icon={Video} OffIcon={VideoOff} danger
          />
          {devices.cams.length > 1 && (
            <button
              type="button"
              onClick={() => setPicker(picker === 'cam' ? null : 'cam')}
              aria-label="Choose camera"
              className="mb-1 -ml-2 rounded-full p-1 text-white/70 hover:bg-white/15 hover:text-white"
            >
              <ChevronUp className="size-3.5" aria-hidden />
            </button>
          )}
        </div>

        <ControlButton
          on={sharing} onClick={onShare} label={sharing ? 'Stop share' : 'Share'}
          Icon={sharing ? MonitorX : ScreenShare} OffIcon={MonitorUp} highlight
        />

        {canAnnotate && (
          <ControlButton
            on={annotating}
            onClick={onAnnotate}
            label={annotating ? 'Drawing' : 'Annotate'}
            Icon={PenLine}
            highlight
            disabled={!screenShareActive}
          />
        )}

        <ControlButton
          on={false} onClick={onParticipants} label={`People ${participants}`} Icon={Users}
        />

        <button
          type="button"
          onClick={onLeave}
          className="ml-1 flex min-w-[4.25rem] flex-col items-center gap-1 rounded-[var(--radius-md)] bg-danger px-3 py-2 text-[0.6875rem] font-semibold text-white hover:bg-danger/90"
        >
          <PhoneOff className="size-5" aria-hidden />
          Leave
        </button>
      </div>
    </div>
  )
}
