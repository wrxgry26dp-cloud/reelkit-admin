/**
 * Import local exam short-drama assets into ReelKit.
 * Folder layout: D:\考试短剧\{语种}\{Title_ID}\封面.jpg + 1.mp4 ... N.mp4
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const idx = line.indexOf('=')
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env) || !process.env[key]) process.env[key] = value
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env.import'))
loadEnvFile(path.resolve(process.cwd(), '.env'))

const ROOT = process.env.IMPORT_ROOT || 'D:\\考试短剧'
const DEFAULT_URL = 'https://pssggtorqkdvxoxwsoaf.supabase.co'
const rawUrl = (process.env.SUPABASE_URL || '').trim()
const SUPABASE_URL = /^https?:\/\//i.test(rawUrl) ? rawUrl : DEFAULT_URL
const SUPABASE_KEY = (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '').trim()
const SHOULD_PUBLISH = process.env.IMPORT_PUBLISH !== '0'
const LIMIT = Number(process.env.IMPORT_LIMIT || 0)

const LANG_TO_LOCALE = {
  法语: 'fr',
  葡语: 'pt',
  日语: 'ja',
  西语: 'es',
  英语: 'en',
}

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_KEY')
  process.exit(1)
}

console.log(`Using URL host=${new URL(SUPABASE_URL).host}, keyLen=${SUPABASE_KEY.length}`)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function slugify(input) {
  const base = String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return base || `drama-${Date.now()}`
}

function parseDramaFolderName(name) {
  const m = name.match(/^(.*)_(\d+)$/)
  if (m) return { title: m[1].trim(), sourceId: m[2] }
  return { title: name.trim(), sourceId: '' }
}

function naturalEpisodeNumber(fileName) {
  const m = path.basename(fileName, path.extname(fileName)).match(/^(\d+)$/)
  return m ? Number(m[1]) : null
}

function mimeForExt(ext) {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
  }
  return map[ext.toLowerCase()] || 'application/octet-stream'
}

async function uploadFile(bucket, storagePath, filePath, contentType) {
  const buffer = fs.readFileSync(filePath)
  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: false,
    cacheControl: '3600',
  })
  if (error) throw new Error(`${bucket}/${storagePath}: ${error.message}`)
}

async function alreadyImported(sourceId, title, locale) {
  if (!sourceId) return false
  const { data, error } = await supabase
    .from('dramas')
    .select('id,slug,title')
    .ilike('slug', `%${sourceId}%`)
    .limit(5)
  if (error) return false
  return (data || []).some(d => d.slug.includes(sourceId))
}

async function importDrama({ langName, locale, dramaDir }) {
  const folderName = path.basename(dramaDir)
  const { title, sourceId } = parseDramaFolderName(folderName)
  if (await alreadyImported(sourceId, title, locale)) {
    console.log('  skip already imported')
    return { id: null, title, slug: null, episodes: 0, locale, langName, skipped: true }
  }
  const files = fs.readdirSync(dramaDir)
  const coverName = files.find(f => /^封面\.(jpe?g|png|webp)$/i.test(f) || /^cover\.(jpe?g|png|webp)$/i.test(f))
  if (!coverName) throw new Error(`缺少封面: ${folderName}`)

  const episodeFiles = files
    .map(f => ({ name: f, ep: naturalEpisodeNumber(f), ext: path.extname(f).toLowerCase() }))
    .filter(f => f.ep && ['.mp4', '.webm', '.mov', '.m4v'].includes(f.ext))
    .sort((a, b) => a.ep - b.ep)

  if (!episodeFiles.length) throw new Error(`缺少剧集视频: ${folderName}`)

  const slug = `${slugify(`${title}-${sourceId || locale}`)}-${Date.now().toString(36)}`
  const synopsis = `${title}（${langName}考试素材${sourceId ? ` #${sourceId}` : ''}）`

  const { data: dramaId, error: dramaErr } = await supabase.rpc('import_exam_create_drama', {
    p_title: title,
    p_slug: slug,
    p_synopsis: synopsis,
    p_tags: [langName, locale, '考试短剧'],
  })
  if (dramaErr) throw dramaErr

  const { error: localeErr } = await supabase
    .from('dramas')
    .update({ primary_locale: locale })
    .eq('id', dramaId)
  if (localeErr) throw localeErr

  const coverExt = path.extname(coverName).toLowerCase() || '.jpg'
  const coverPath = `exam-import/${dramaId}/cover-${Date.now()}${coverExt}`
  await uploadFile('posters', coverPath, path.join(dramaDir, coverName), mimeForExt(coverExt))
  const coverUrl = supabase.storage.from('posters').getPublicUrl(coverPath).data.publicUrl
  const { error: coverErr } = await supabase.rpc('import_exam_set_cover', {
    p_drama_id: dramaId,
    p_cover_path: coverPath,
    p_cover_url: coverUrl,
  })
  if (coverErr) throw coverErr

  for (const epFile of episodeFiles) {
    const { data: episodeId, error: epErr } = await supabase.rpc('import_exam_create_episode', {
      p_drama_id: dramaId,
      p_episode_number: epFile.ep,
      p_title: `Episode ${epFile.ep}`,
    })
    if (epErr) throw epErr

    const localPath = path.join(dramaDir, epFile.name)
    const size = fs.statSync(localPath).size
    const safeName = epFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const storagePath = `exam-import/${dramaId}/${episodeId}/${locale}/${Date.now()}-${safeName}`
    const mime = mimeForExt(epFile.ext)
    await uploadFile('videos', storagePath, localPath, mime)

    const { error: videoErr } = await supabase.rpc('import_exam_upsert_video', {
      p_episode_id: episodeId,
      p_locale: locale,
      p_storage_path: storagePath,
      p_file_name: epFile.name,
      p_file_size: size,
      p_mime_type: mime,
    })
    if (videoErr) throw videoErr
    process.stdout.write(`    ep${epFile.ep}/${episodeFiles.length} ok (${Math.round(size / 1024 / 1024 * 10) / 10}MB)\n`)
  }

  if (SHOULD_PUBLISH) {
    const { error: pubErr } = await supabase.rpc('import_exam_publish_drama', { p_drama_id: dramaId })
    if (pubErr) throw pubErr
  }

  return { id: dramaId, title, slug, episodes: episodeFiles.length, locale, langName }
}

async function main() {
  const jobs = []
  for (const langName of fs.readdirSync(ROOT)) {
    const locale = LANG_TO_LOCALE[langName]
    if (!locale) continue
    const langDir = path.join(ROOT, langName)
    if (!fs.statSync(langDir).isDirectory()) continue
    for (const dramaName of fs.readdirSync(langDir)) {
      const dramaDir = path.join(langDir, dramaName)
      if (!fs.statSync(dramaDir).isDirectory()) continue
      jobs.push({ langName, locale, dramaDir })
    }
  }

  const selected = LIMIT > 0 ? jobs.slice(0, LIMIT) : jobs
  console.log(`Found ${jobs.length} dramas, importing ${selected.length}, publish=${SHOULD_PUBLISH}`)

  const results = []
  for (const [index, job] of selected.entries()) {
    console.log(`[${index + 1}/${selected.length}] ${job.langName} / ${path.basename(job.dramaDir)}`)
    try {
      const result = await importDrama(job)
      results.push({ ok: true, ...result })
      console.log(`  => ${result.slug}`)
    }
    catch (error) {
      results.push({ ok: false, drama: path.basename(job.dramaDir), error: error.message || String(error) })
      console.error(`  !! ${error.message || error}`)
    }
  }

  const outPath = path.join(process.cwd(), 'scripts', `_import-result-${Date.now()}.json`)
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8')
  console.log(`Done success=${results.filter(r => r.ok).length} failed=${results.filter(r => !r.ok).length}`)
  console.log(outPath)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
