'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  ParticipantTile, RoomAudioRenderer, RoomContext, useTracks,
} from '@livekit/components-react'
import { Room, RoomEvent, Track, type RemoteParticipant } from 'livekit-client'
import '@livekit/components-styles'
import {
  AlertCircle, Flag, Loader2, PenLine, ShieldCheck, Timer, Video, WifiOff, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Whiteboard } from '@/components/room/whiteboard'
import { CompanionInvite } from '@/components/room/companion-invite'
import { RoomControls } from '@/components/room/room-controls'
import { cn } from '@/lib/utils'

interface TokenResponse {
  token: string
  url: string
  room: string
  device: 'primary' | 'companion'
  role: 'mentor' | 'student'
  title: string
  endsAt: string
  fallbackMeetUrl: string | null
}

type Phase = 'prejoin' | 'connecting' | 'live' | 'error'

/**
 * Remembers that this person was in this room.
 *
 * A closed tab, a refresh or a stray Back gesture drops the call, and the
 * pre-join screen is the wrong thing to show somebody who was mid-sentence
 * thirty seconds ago. sessionStorage, not localStorage: this is about this tab
 * and this sitting, and it should not survive a browser restart tomorrow.
 */
const wasInKey = (sessionId: string) => `ym:inroom:${sessionId}`

function rememberIn(sessionId: string) {
  try {
    sessionStorage.setItem(wasInKey(sessionId), String(Date.now()))
  } catch {
    /* private mode, or storage disabled */
  }
}

function forgetIn(sessionId: string) {
  try {
    sessionStorage.removeItem(wasInKey(sessionId))
  } catch {
    /* private mode, or storage disabled */
  }
}

function wasIn(sessionId: string) {
  try {
    const at = Number(sessionStorage.getItem(wasInKey(sessionId)))
    // Only recent, so a stale key cannot pull somebody into a call they left
    // hours ago on purpose.
    return !!at && Date.now() - at < 4 * 60 * 60_000
  } catch {
    return false
  }
}

/** Nothing to subscribe to: the flag is read once per mount. */
const noSubscribe = () => () => {}

export function SessionRoom({
  sessionId, displayName, device = 'primary',
}: {
  sessionId: string
  displayName: string
  /** A companion is a second device — a tablet used as a writing surface. */
  device?: 'primary' | 'companion'
}) {
  const [phase, setPhase] = useState<Phase>('prejoin')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<TokenResponse | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  /** Spec §7: students on weak mobile data need to drop video entirely. */
  const [audioOnly, setAudioOnly] = useState(false)
  const resumeWanted = useSyncExternalStore(
    noSubscribe,
    () => wasIn(sessionId),   // client: did this tab just drop out?
    () => false               // server: it cannot know, and must not guess
  )
  const resumed = useRef(false)

  const joining = useRef(false)

  const join = useCallback(async () => {
    if (joining.current) return
    joining.current = true
    setPhase('connecting')
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device }),
      })
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
      // A companion publishes nothing — the laptop beside it is already the
      // camera and the microphone for this person.
      if (device === 'primary') {
        await r.localParticipant.setMicrophoneEnabled(true)
        await r.localParticipant.setCameraEnabled(!audioOnly)
      }

      rememberIn(sessionId)
      setInfo(data)
      setRoom(r)
      setPhase('live')
    } catch (e) {
      // The session being over is the common reason a resume fails, and it is
      // not worth offering to retry — clear the flag so coming back here again
      // does not immediately try and fail once more.
      const message = e instanceof Error ? e.message : 'Could not join this session.'
      if (/ended|no longer|cancelled/i.test(message)) forgetIn(sessionId)
      setError(message)
      setPhase('error')
    } finally {
      joining.current = false
    }
  }, [sessionId, audioOnly, device])

  // Dropped out and came back: go straight in, once.
  useEffect(() => {
    if (resumeWanted && !resumed.current) {
      resumed.current = true
      void join()
    }
  }, [resumeWanted, join])

  useEffect(() => () => { room?.disconnect() }, [room])

  useEffect(() => {
    if (!room || device !== 'primary') return
    void room.localParticipant.setCameraEnabled(!audioOnly)
  }, [audioOnly, room, device])

  // A refresh or a closed tab drops the call, so warn before it happens.
  useEffect(() => {
    if (phase !== 'live') return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [phase])

  if (phase === 'live' && room && info) {
    return (
      <LiveRoom
        room={room}
        info={info}
        sessionId={sessionId}
        device={device}
        audioOnly={audioOnly}
        onAudioOnly={setAudioOnly}
        onLeft={() => {
          forgetIn(sessionId)
          resumed.current = true   // leaving on purpose must not re-trigger a resume
          setRoom(null)
          setPhase('prejoin')
        }}
      />
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
              <Button variant="outline" onClick={() => void join()}>Try again</Button>
              <Button asChild><Link href="/my-sessions">My sessions</Link></Button>
            </div>
          </>
        ) : resumeWanted && phase === 'connecting' ? (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" aria-hidden />
            <h1 className="mt-4 text-xl">Taking you back in…</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              You were in this session a moment ago. Rejoining now — nobody else was
              dropped while you were away.
            </p>
          </div>
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
              onClick={() => void join()}
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

/* ========================================================== the live room == */

interface LiveRoomProps {
  room: Room
  info: TokenResponse
  sessionId: string
  device: 'primary' | 'companion'
  audioOnly: boolean
  onAudioOnly: (v: boolean) => void
  onLeft: () => void
}

/**
 * The provider has to be above the hooks that read it.
 *
 * useTracks() calls useRoomContext(), so calling it in the same component that
 * renders RoomContext.Provider leaves it reading no context at all — a hook
 * cannot consume a context its own component provides. The screen-share lookup
 * was in that position, which is why annotation never lit up and why a rejoin
 * could take the whole page down rather than showing an error.
 */
function LiveRoom(props: LiveRoomProps) {
  return (
    <RoomContext.Provider value={props.room}>
      <LiveRoomInner {...props} />
    </RoomContext.Provider>
  )
}

function LiveRoomInner({
  room, info, sessionId, device, audioOnly, onAudioOnly, onLeft,
}: LiveRoomProps) {
  const [view, setView] = useState<'video' | 'board'>(device === 'companion' ? 'board' : 'video')
  const [micOn, setMicOn] = useState(device === 'primary')
  const [camOn, setCamOn] = useState(device === 'primary' && !audioOnly)
  const [sharing, setSharing] = useState(false)
  const [wantAnnotate, setWantAnnotate] = useState(false)
  const [showPeople, setShowPeople] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [people, setPeople] = useState(room.numParticipants + 1)
  const [left, setLeft] = useState('')
  const [deviceError, setDeviceError] = useState<string | null>(null)

  // The chrome reads its state from the room, not from what this component last
  // asked for — a track can be muted by the browser, by a permissions prompt or
  // from a companion device, and the buttons must still tell the truth.
  useEffect(() => {
    const sync = () => {
      setMicOn(room.localParticipant.isMicrophoneEnabled)
      setCamOn(room.localParticipant.isCameraEnabled)
      setSharing(room.localParticipant.isScreenShareEnabled)
      setPeople(room.numParticipants + 1)
    }
    const onReconnecting = () => setReconnecting(true)
    const onReconnected = () => setReconnecting(false)
    // LiveKit gives up after its own retries. Staying on a "live" screen whose
    // buttons all throw is worse than saying the connection went.
    const onDisconnected = () => onLeft()

    room.on(RoomEvent.LocalTrackPublished, sync)
    room.on(RoomEvent.LocalTrackUnpublished, sync)
    room.on(RoomEvent.TrackMuted, sync)
    room.on(RoomEvent.TrackUnmuted, sync)
    room.on(RoomEvent.ParticipantConnected, sync)
    room.on(RoomEvent.ParticipantDisconnected, sync)
    room.on(RoomEvent.Reconnecting, onReconnecting)
    room.on(RoomEvent.Reconnected, onReconnected)
    room.on(RoomEvent.Disconnected, onDisconnected)
    sync()
    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync)
      room.off(RoomEvent.LocalTrackUnpublished, sync)
      room.off(RoomEvent.TrackMuted, sync)
      room.off(RoomEvent.TrackUnmuted, sync)
      room.off(RoomEvent.ParticipantConnected, sync)
      room.off(RoomEvent.ParticipantDisconnected, sync)
      room.off(RoomEvent.Reconnecting, onReconnecting)
      room.off(RoomEvent.Reconnected, onReconnected)
      room.off(RoomEvent.Disconnected, onDisconnected)
    }
  }, [room, onLeft])

  // How long is left, so the room closing is never a surprise.
  useEffect(() => {
    const tick = () => {
      const ms = new Date(info.endsAt).getTime() - Date.now()
      if (ms <= 0) {
        setLeft('time is up')
        return
      }
      const m = Math.floor(ms / 60_000)
      setLeft(m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m + 1}m left`)
    }
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [info.endsAt])

  const screen = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], {
    onlySubscribed: false,
  })
  const screenShareActive = screen.length > 0

  // Annotation draws on top of a shared screen, so with nothing shared there is
  // nothing to point at. Derived rather than corrected after the fact: the two
  // can never disagree, and it comes straight back when sharing resumes.
  const annotating = wantAnnotate && screenShareActive

  const canDraw = info.role === 'mentor' || device === 'companion'

  /**
   * Every control goes through this. Toggling a track on a room that has just
   * died throws, and an unhandled rejection inside an onClick is what replaced
   * the call with "something went wrong, reload" instead of an error we chose.
   */
  function guard(fn: () => Promise<unknown>) {
    return () => {
      fn().catch(() => setDeviceError('That did not work. Your connection may have dropped.'))
    }
  }

  async function toggleShare() {
    try {
      await room.localParticipant.setScreenShareEnabled(!sharing, { audio: true })
    } catch {
      /* the share picker was dismissed, which is not an error */
    }
  }

  async function leave() {
    forgetIn(sessionId)
    await room.disconnect()
    onLeft()
  }

  return (
    <>
      <div className="flex h-[calc(100dvh-4rem)] flex-col bg-[var(--navy-900)]">
        {/* ---------------------------------------------------------- header */}
        <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {reconnecting ? (
              <Badge tone="amber">
                <Loader2 className="size-3 animate-spin" aria-hidden /> Reconnecting
              </Badge>
            ) : (
              <Badge tone="danger">● Live</Badge>
            )}
            <p className="truncate text-sm font-semibold text-white">{info.title}</p>
            <span className="hidden shrink-0 items-center gap-1 text-xs text-white/60 sm:flex">
              <Timer className="size-3" aria-hidden /> {left}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex rounded-[var(--radius-pill)] bg-white/10 p-0.5">
              {(['video', 'board'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-semibold transition-colors',
                    view === v ? 'bg-white text-[var(--navy-900)]' : 'text-white hover:bg-white/10'
                  )}
                >
                  {v === 'video' ? <Video className="size-3.5" /> : <PenLine className="size-3.5" />}
                  {v === 'video' ? 'Video' : 'Whiteboard'}
                </button>
              ))}
            </div>

            {device === 'primary' && <CompanionInvite sessionId={sessionId} />}

            <button
              type="button"
              onClick={() => onAudioOnly(!audioOnly)}
              hidden={device === 'companion'}
              aria-pressed={audioOnly}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <WifiOff className="size-3.5" aria-hidden />
              {audioOnly ? 'Data saver on' : 'Data saver'}
            </button>
            <Link
              href={`/report?type=session&id=${sessionId}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger"
            >
              <Flag className="size-3.5" aria-hidden /> Report
            </Link>
          </div>
        </header>

        {/* ----------------------------------------------------------- stage */}
        <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-2 sm:px-4">
          {view === 'board' ? (
            <Whiteboard room={room} canDraw={canDraw} />
          ) : (
            <Stage
              room={room}
              annotating={annotating}
              canDraw={canDraw}
              onStopAnnotating={() => setWantAnnotate(false)}
            />
          )}

          {showPeople && <PeoplePanel room={room} onClose={() => setShowPeople(false)} />}

          {deviceError && (
            <button
              type="button"
              onClick={() => setDeviceError(null)}
              className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-[var(--radius-pill)] bg-danger px-4 py-2 text-xs font-semibold text-white"
            >
              {deviceError} · dismiss
            </button>
          )}
        </div>

        {/* -------------------------------------------------------- controls */}
        {device === 'primary' ? (
          <div className="flex justify-center px-2 pb-3">
            <RoomControls
              room={room}
              micOn={micOn}
              camOn={camOn}
              sharing={sharing}
              annotating={annotating}
              canAnnotate={canDraw}
              screenShareActive={screenShareActive}
              participants={people}
              onMic={guard(() => room.localParticipant.setMicrophoneEnabled(!micOn))}
              onCam={guard(() => room.localParticipant.setCameraEnabled(!camOn))}
              onShare={guard(toggleShare)}
              onAnnotate={() => setWantAnnotate((v) => !v)}
              onParticipants={() => setShowPeople((v) => !v)}
              onLeave={guard(leave)}
            />
          </div>
        ) : (
          <p className="pb-3 text-center text-xs text-white/60">
            Companion device · drawing only
          </p>
        )}

        <RoomAudioRenderer />
      </div>
    </>
  )
}

/* ================================================================= stage == */

/**
 * When somebody shares a screen it takes the room and the faces drop to a
 * filmstrip, because the shared thing is what the conversation is now about.
 * Without a share, the faces are the content.
 */
function Stage({
  room, annotating, canDraw, onStopAnnotating,
}: {
  room: Room
  annotating: boolean
  canDraw: boolean
  onStopAnnotating: () => void
}) {
  const camera = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  })
  const screen = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], {
    onlySubscribed: false,
  })

  if (screen.length > 0 && screen[0]) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius-md)] bg-black">
          {/* object-contain, not cover: cropping someone's code is worse than
              letterboxing it. */}
          <ParticipantTile trackRef={screen[0]} className="size-full [&_video]:object-contain" />
          {annotating && (
            <Whiteboard
              room={room}
              canDraw={canDraw}
              surface="overlay"
              onClose={onStopAnnotating}
            />
          )}
        </div>

        {camera.length > 0 && (
          <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
            {camera.map((t) => (
              <div
                key={`${t.participant.identity}-${t.source}`}
                className="h-24 w-36 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/60 sm:h-28 sm:w-44"
              >
                <ParticipantTile trackRef={t} className="size-full" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid min-h-0 flex-1 gap-2',
        camera.length <= 1 && 'grid-cols-1',
        camera.length === 2 && 'grid-cols-1 sm:grid-cols-2',
        camera.length > 2 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      {camera.map((t) => (
        <div
          key={`${t.participant.identity}-${t.source}`}
          className="min-h-0 overflow-hidden rounded-[var(--radius-md)] bg-black/60"
        >
          <ParticipantTile trackRef={t} className="size-full" />
        </div>
      ))}
    </div>
  )
}

/* ================================================================ people == */

function PeoplePanel({ room, onClose }: { room: Room; onClose: () => void }) {
  const [list, setList] = useState<{ name: string; identity: string; me: boolean }[]>([])

  useEffect(() => {
    const build = () => {
      const remote = [...room.remoteParticipants.values()] as RemoteParticipant[]
      setList([
        {
          name: room.localParticipant.name || 'You',
          identity: room.localParticipant.identity,
          me: true,
        },
        ...remote.map((p) => ({ name: p.name || 'Guest', identity: p.identity, me: false })),
      ])
    }
    build()
    room.on(RoomEvent.ParticipantConnected, build)
    room.on(RoomEvent.ParticipantDisconnected, build)
    return () => {
      room.off(RoomEvent.ParticipantConnected, build)
      room.off(RoomEvent.ParticipantDisconnected, build)
    }
  }, [room])

  return (
    <aside className="absolute right-0 top-0 z-30 w-60 rounded-[var(--radius-md)] border border-white/15 bg-[var(--navy-900)] p-3 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-white/60">In this room</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close participants"
          className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {list.map((p) => (
          <li
            key={p.identity}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-white"
          >
            <span className="truncate font-semibold">{p.name}</span>
            {/* A tablet joins as its own participant and would otherwise read as
                a stranger with the same name. */}
            {p.identity.includes('#companion') ? (
              <span className="shrink-0 text-[0.625rem] text-white/50">tablet</span>
            ) : p.me ? (
              <span className="shrink-0 text-[0.625rem] text-white/50">you</span>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  )
}
