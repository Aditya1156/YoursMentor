'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SOURCE = 12 * 1024 * 1024
const MAX_EDGE = 512

/**
 * Profile photo, resized in the browser before it is uploaded.
 *
 * A photo straight off a phone camera is routinely 4–8MB, and it is going to
 * be shown at 64 pixels. Uploading it whole would cost a student on mobile
 * data several minutes and most of a day's allowance, then cost them again
 * every time anyone loads the directory. Downscaling to 512px and re-encoding
 * as WebP takes it to roughly 30–60KB, and the file never leaves the device
 * at full size.
 *
 * The storage policy keys on the first path segment being the user id, so one
 * person can never overwrite another's photo. The old file is removed on
 * replace rather than left behind as an orphan nobody can see or bill for.
 */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process that image.')

  // Square crop from the centre, so a portrait photo does not end up with the
  // face at the top of a circular frame.
  const side = Math.min(w, h)
  const sx = (bitmap.width - side / scale) / 2
  const sy = (bitmap.height - side / scale) / 2
  canvas.width = side
  canvas.height = side
  ctx.drawImage(bitmap, sx, sy, side / scale, side / scale, 0, 0, side, side)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process that image.'))),
      'image/webp',
      0.85
    )
  })
}

export function AvatarUpload({
  name,
  currentUrl,
  size = 'xl',
}: {
  name: string
  currentUrl?: string
  size?: 'lg' | 'xl'
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(currentUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setError(null)
    if (!ACCEPTED.includes(file.type)) {
      setError('Upload a JPG, PNG or WebP.')
      return
    }
    if (file.size > MAX_SOURCE) {
      setError('That image is very large. Try one under 12MB.')
      return
    }

    setBusy(true)
    try {
      const resized = await downscale(file)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Your session expired. Please sign in again.')

      const path = `${user.id}/avatar-${Date.now()}.webp`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, resized, { contentType: 'image/webp', upsert: true })
      if (uploadError) throw uploadError

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)

      const { error: saveError } = await supabase
        .from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', user.id)
      if (saveError) throw saveError

      // Clear the previous file. Harmless if it fails — the profile already
      // points at the new one.
      const old = url?.split('/avatars/')[1]
      if (old) await supabase.storage.from('avatars').remove([old])

      setUrl(pub.publicUrl)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload that photo.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Your session expired.')

      const path = url?.split('/avatars/')[1]
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
      if (path) await supabase.storage.from('avatars').remove([path])

      setUrl(undefined)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={name} src={url} size={size} />
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
              <Loader2 className="size-5 animate-spin text-white" aria-hidden />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Camera aria-hidden /> {url ? 'Change photo' : 'Add a photo'}
            </Button>
            {url && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
                <Trash2 aria-hidden /> Remove
              </Button>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            JPG, PNG or WebP. We shrink it on your phone before uploading, so it costs
            almost no data.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void upload(f)
          e.target.value = ''
        }}
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}
    </div>
  )
}
