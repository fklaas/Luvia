import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const auth = request.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ ok: false, error: 'AUTH_REQUIRED' }, 401)

    const body = await request.json().catch(() => ({}))
    const tripId = String(body.tripId || '')
    const limit = Math.min(100, Math.max(1, Number(body.limit || 50)))
    if (!tripId) return json({ ok: false, error: 'TRIP_REQUIRED' }, 400)

    const membership = await userClient.from('trip_members').select('trip_id').eq('trip_id', tripId).eq('user_id', user.id).maybeSingle()
    if (membership.error || !membership.data) return json({ ok: false, error: 'FORBIDDEN' }, 403)

    const rows = await admin.from('media')
      .select('id,trip_id,user_id,storage_bucket,storage_path,preview_path,preview_1280_path,thumb_256_path,thumb_640_path')
      .eq('trip_id', tripId).eq('type', 'image').neq('status', 'deleted')
      .order('created_at', { ascending: true })
      .limit(limit)
    if (rows.error) throw rows.error

    const results = []
    for (const media of rows.data || []) {
      try {
        const source = media.preview_1280_path || media.preview_path || media.storage_path
        if (!source) continue
        const bucket = media.storage_bucket || 'luvia-media'
        const base = `${media.trip_id}/${media.user_id}/${media.id}`
        const variants = [
          { column: 'thumb_256_path', path: `${base}/thumb-256.webp`, width: 256, quality: 58 },
          { column: 'thumb_640_path', path: `${base}/thumb-640.webp`, width: 640, quality: 68 },
        ]
        const patch: Record<string, string> = {}
        for (const variant of variants) {
          const signed = await admin.storage.from(bucket).createSignedUrl(source, 300, {
            transform: { width: variant.width, height: variant.width, resize: 'cover', quality: variant.quality },
          })
          if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error('SIGN_FAILED')
          const response = await fetch(signed.data.signedUrl)
          if (!response.ok) throw new Error(`TRANSFORM_${response.status}`)
          const bytes = await response.arrayBuffer()
          const uploaded = await admin.storage.from('luvia-media-thumbnails').upload(variant.path, bytes, {
            upsert: true, contentType: response.headers.get('content-type') || 'image/webp', cacheControl: '31536000',
          })
          if (uploaded.error) throw uploaded.error
          patch[variant.column] = variant.path
        }
        const updated = await admin.from('media').update({ ...patch, thumbnail_path: patch.thumb_640_path }).eq('id', media.id)
        if (updated.error) throw updated.error
        results.push({ mediaId: media.id, ok: true })
      } catch (error) {
        results.push({ mediaId: media.id, ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return json({ ok: true, processed: results.length, results })
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
  }
})

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
