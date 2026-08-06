import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type JsonRecord = Record<string, unknown>

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL')
    const anonKey = requiredEnv('SUPABASE_ANON_KEY')
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    const auth = request.headers.get('Authorization') || ''

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const authResult = await userClient.auth.getUser()
    if (authResult.error || !authResult.data.user) {
      console.error('[luvia-media-delivery] auth', normalizeError(authResult.error || new Error('AUTH_REQUIRED')))
      return json({ ok: false, error: 'AUTH_REQUIRED', details: normalizeError(authResult.error) }, 401)
    }
    const user = authResult.data.user

    const body = await request.json().catch(() => ({})) as JsonRecord
    const tripId = String(body.tripId || '')
    const limit = Math.min(100, Math.max(1, Number(body.limit || 50)))
    if (!tripId) return json({ ok: false, error: 'TRIP_REQUIRED' }, 400)

    const membership = await userClient
      .from('trip_members')
      .select('trip_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membership.error || !membership.data) {
      console.error('[luvia-media-delivery] membership', normalizeError(membership.error || new Error('FORBIDDEN')))
      return json({ ok: false, error: 'FORBIDDEN', details: normalizeError(membership.error) }, 403)
    }

    // select('*') intentionally keeps this function compatible with legacy media rows/schema revisions.
    const rows = await admin
      .from('media')
      .select('*')
      .eq('trip_id', tripId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (rows.error) {
      console.error('[luvia-media-delivery] media_query', normalizeError(rows.error))
      return json({ ok: false, stage: 'media_query', error: normalizeError(rows.error) }, 500)
    }

    const sourceRows = (rows.data || []).filter((row: JsonRecord) => {
      const type = String(row.type || 'image')
      const mime = String(row.mime_type || '')
      return type === 'image' || mime.startsWith('image/') || Boolean(row.preview_path || row.storage_path)
    })

    const results: JsonRecord[] = []
    for (const media of sourceRows) {
      const mediaId = String(media.id || '')
      try {
        const result = await processMedia(admin, media)
        results.push({ mediaId, ...result })
      } catch (error) {
        const details = normalizeError(error)
        console.error('[luvia-media-delivery] media', { mediaId, ...details })
        results.push({ mediaId, ok: false, stage: 'media', error: details })
      }
    }

    const succeeded = results.filter((entry) => entry.ok === true).length
    const skipped = results.filter((entry) => entry.skipped === true).length
    const failed = results.length - succeeded - skipped

    return json({
      ok: failed === 0,
      processed: results.length,
      succeeded,
      skipped,
      failed,
      results,
    }, failed === results.length && results.length ? 500 : 200)
  } catch (error) {
    const details = normalizeError(error)
    console.error('[luvia-media-delivery] fatal', details)
    return json({ ok: false, stage: 'fatal', error: details }, 500)
  }
})

async function processMedia(admin: ReturnType<typeof createClient>, media: JsonRecord) {
  const mediaId = String(media.id || '')
  const tripId = String(media.trip_id || '')
  const userId = String(media.user_id || media.participant_id || 'shared')
  const source = firstString(media.preview_1280_path, media.preview_path, media.thumbnail_path, media.storage_path)
  if (!mediaId || !tripId || !source) return { ok: false, skipped: true, reason: 'SOURCE_MISSING' }

  const sourceBucket = String(media.storage_bucket || 'luvia-media')
  const targetBucket = 'luvia-media-thumbnails'
  const base = `${tripId}/${userId}/${mediaId}`
  const variants = [
    { column: 'thumb_256_path', path: `${base}/thumb-256.webp`, width: 256, quality: 58 },
    { column: 'thumb_640_path', path: `${base}/thumb-640.webp`, width: 640, quality: 68 },
  ]

  const patch: Record<string, string> = {}
  const created: string[] = []
  const retained: string[] = []

  for (const variant of variants) {
    const existingPath = firstString(media[variant.column])
    if (existingPath && await objectExists(admin, targetBucket, existingPath)) {
      patch[variant.column] = existingPath
      retained.push(variant.column)
      continue
    }

    const bytes = await transformedBytes(admin, sourceBucket, source, variant.width, variant.quality)
    const uploaded = await admin.storage.from(targetBucket).upload(variant.path, bytes.body, {
      upsert: true,
      contentType: bytes.contentType,
      cacheControl: '31536000',
    })
    if (uploaded.error) throw stageError('thumbnail_upload', uploaded.error, { mediaId, path: variant.path })
    patch[variant.column] = variant.path
    created.push(variant.column)
  }

  if (!Object.keys(patch).length) return { ok: false, skipped: true, reason: 'NO_VARIANTS' }

  const updated = await admin
    .from('media')
    .update({ ...patch, thumbnail_path: patch.thumb_640_path || firstString(media.thumbnail_path) || null })
    .eq('id', mediaId)
    .eq('trip_id', tripId)
    .select('id')
    .maybeSingle()
  if (updated.error) throw stageError('media_update', updated.error, { mediaId })

  return { ok: true, created, retained, sourceBucket, source }
}

async function transformedBytes(admin: ReturnType<typeof createClient>, bucket: string, source: string, width: number, quality: number) {
  const signed = await admin.storage.from(bucket).createSignedUrl(source, 300, {
    transform: { width, height: width, resize: 'cover', quality },
  })
  if (signed.error || !signed.data?.signedUrl) {
    throw stageError('transform_sign', signed.error || new Error('SIGN_FAILED'), { bucket, source, width })
  }

  const response = await fetch(signed.data.signedUrl)
  if (!response.ok) {
    throw stageError('transform_fetch', new Error(`HTTP_${response.status}`), { bucket, source, width })
  }

  const contentType = response.headers.get('content-type') || 'image/webp'
  if (!contentType.startsWith('image/')) {
    throw stageError('transform_content_type', new Error(`UNEXPECTED_${contentType}`), { bucket, source, width })
  }

  const body = await response.arrayBuffer()
  if (body.byteLength < 512) {
    throw stageError('transform_empty', new Error(`TOO_SMALL_${body.byteLength}`), { bucket, source, width })
  }
  return { body, contentType }
}

async function objectExists(admin: ReturnType<typeof createClient>, bucket: string, path: string) {
  const slash = path.lastIndexOf('/')
  const folder = slash >= 0 ? path.slice(0, slash) : ''
  const name = slash >= 0 ? path.slice(slash + 1) : path
  const listed = await admin.storage.from(bucket).list(folder, { limit: 20, search: name })
  if (listed.error) return false
  return (listed.data || []).some((entry) => entry.name === name)
}

function firstString(...values: unknown[]) {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim()
  return ''
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`ENV_MISSING_${name}`)
  return value
}

function stageError(stage: string, error: unknown, context: JsonRecord = {}) {
  return { stage, ...normalizeError(error), context }
}

function normalizeError(error: unknown): JsonRecord {
  if (!error) return { message: 'UNKNOWN_ERROR' }
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack }
  if (typeof error === 'string') return { message: error }
  if (typeof error === 'object') {
    const value = error as Record<string, unknown>
    return {
      code: value.code ?? null,
      message: value.message ?? value.error_description ?? value.error ?? 'UNKNOWN_ERROR',
      details: value.details ?? null,
      hint: value.hint ?? null,
      status: value.status ?? value.statusCode ?? null,
      ...value,
    }
  }
  return { message: String(error) }
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  })
}
