'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ControlBar, GridLayout, ParticipantTile, RoomAudioRenderer, RoomContext,
  useTracks,
} from '@livekit/components-react'
import { Room, Track } from 'livekit-client'
import '@livekit/components-styles'
import { AlertCircle, Flag, Loader2, MicOff, ShieldCheck, Video, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface TokenResponse {
  token: string
  url: string
  room: string
  role: 'mentor' | 'student'
  title: string
  endsAt: string
  fallbackMeetUrl: string | null
}

type Phase = 'prejoin' | 'connecting' | 'live' | 'error'

export function SessionRoom({
  sessionId, displayName,
}: { sessionId: string; displayName: string }) {
  const [phase, setPhase] = useState<Phase>('prejoin')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<TokenResponse | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  /** Spec §7: students on weak mobile data need to drop video entirely. */
  const [audioOnly, setAudioOnly] = useState(false)

  const join = useCallback(async () => {
    setPhase('connecting')
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/token`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not join this session.')

      if (data.fallbackMeetUrl) {
        window.location.href = data.fallbackMeetUrl
        return
      }

      const r = new Room({
        adaptiveStream: true,          // drops resolution before it drops the call
        dynacast: true,
        videoCaptureDefaults: { resolution: { width: 640, height: 360, frameRate: 24 } },
      })
      await r.connect(data.url, data.token)
      await r.localParticipant.setMicrophoneEnabled(true)
      await r.localParticipant.setCameraEnabled(!audioOnly)

      setInfo(data)
      setRoom(r)
      setPhase('live')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join this session.')
      setPhase('error')
    }
  }, [sessionId, audioOnly])

  useEffect(() => () => { room?.disconnect() }, [room])

  useEffect(() => {
    if (!room) return
    void room.localParticipant.setCameraEnabled(!audioOnly)
  }, [audioOnly, room])

  if (phase === 'live' && room && info) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col bg-[var(--navy-900)]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Badge tone="danger">● Live</Badge>
            <p className="truncate text-sm font-semibold text-white">{info.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAudioOnly((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              {audioOnly ? <MicOff className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
              {audioOnly ? 'Video off (data saver)' : 'Audio-only mode'}
            </button>
            <Link
              href={`/report?type=session&id=${sessionId}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger"
            >
              <Flag className="size-3.5" aria-hidden /> Report
            </Link>
          </div>
        </div>

        <RoomContext.Provider value={room}>
          <div className="flex min-h-0 flex-1 flex-col">
            <Stage />
            <RoomAudioRenderer />
            <ControlBar variation="verbose" />
          </div>
        </RoomContext.Provider>
      </div>
    )
  }

  return (
    <div className="container-page max-w-lg py-10 md:py-16">
      <Card className="p-6 sm:p-8">
        {phase === 'error' ? (
          <>
            <span className="flex size-11 items-center justify-center rounded-full bg-danger-soft">
              <AlertCircle className="size-5 text-danger" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl">You can&rsquo;t join this one</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{error}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" onClick={join}>Try again</Button>
              <Button asChild><Link href="/my-sessions">My sessions</Link></Button>
            </div>
          </>
        ) : (
          <>
            <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft">
              <Video className="size-5 text-primary" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl">Ready to join, {displayName.split(' ')[0]}?</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Your camera and microphone switch on when you join. You can turn either off
              inside the room.
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface-muted p-3.5">
              <input
                type="checkbox"
                checked={audioOnly}
                onChange={(e) => setAudioOnly(e.target.checked)}
                className="mt-0.5 size-4 rounded-[4px] border-border accent-[var(--primary)]"
              />
              <span className="text-sm">
                <span className="font-semibold">Audio-only mode</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  Join without video. Much lighter on mobile data — pick this if your
                  connection is patchy.
                </span>
              </span>
            </label>

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
              Keep contact on the platform. Phone numbers and social handles shared in chat
              are hidden automatically. Nothing is recorded.
            </p>

            <Button
              full
              size="lg"
              className="mt-5"
              disabled={phase === 'connecting'}
              onClick={join}
            >
              {phase === 'connecting' && <Loader2 className="animate-spin" aria-hidden />}
              {phase === 'connecting' ? 'Connecting…' : 'Join session'}
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  return (
    <GridLayout tracks={tracks} className="min-h-0 flex-1">
      <ParticipantTile />
    </GridLayout>
  )
}
