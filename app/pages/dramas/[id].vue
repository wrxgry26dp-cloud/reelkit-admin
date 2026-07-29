<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const LOCALES = [
  { code: 'fr', label: '法语' },
  { code: 'pt', label: '葡语' },
  { code: 'ja', label: '日语' },
  { code: 'es', label: '西语' },
  { code: 'en', label: '英语' },
]

const route = useRoute()
const client = useSupabaseClient()
const id = computed(() => String(route.params.id))

const { data: drama, refresh: refreshDrama } = await useAsyncData(`d-${id.value}`, async () => {
  const { data, error } = await client.from('dramas').select('*').eq('id', id.value).single()
  if (error) throw error
  return data
})

const { data: tags } = await useAsyncData('tags-all', async () => {
  const { data } = await client.from('tags').select('*').order('sort_order')
  return data || []
})

const { data: linkedTags, refresh: refreshLinked } = await useAsyncData(`dt-${id.value}`, async () => {
  const { data } = await client.from('drama_tags').select('tag_id').eq('drama_id', id.value)
  return (data || []).map((x: any) => x.tag_id as string)
})

const selectedTags = ref<string[]>([])
watch(linkedTags, (v) => { selectedTags.value = [...(v || [])] }, { immediate: true })

const form = reactive({ title: '', slug: '', synopsis: '', status: 'draft', is_trending: false, cover_url: '' })
watch(drama, (d) => {
  if (!d) return
  Object.assign(form, { title: d.title, slug: d.slug, synopsis: d.synopsis, status: d.status, is_trending: d.is_trending, cover_url: d.cover_url || '' })
}, { immediate: true })

const { data: episodes, refresh: refreshEpisodes } = await useAsyncData(`eps-${id.value}`, async () => {
  const { data, error } = await client.from('episodes').select('*').eq('drama_id', id.value).order('episode_number')
  if (error) throw error
  return data || []
})

const episodeForm = reactive({ episode_number: 1, title: '', coin_price: 0, is_free: true })
const videoForms = reactive<Record<string, string>>({ fr: '', pt: '', ja: '', es: '', en: '' })
const message = ref('')

async function saveDrama() {
  const { error } = await client.from('dramas').update({
    ...form,
    cover_url: form.cover_url || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id.value)
  if (error) return (message.value = error.message)
  await client.from('drama_tags').delete().eq('drama_id', id.value)
  if (selectedTags.value.length) {
    await client.from('drama_tags').insert(selectedTags.value.map(tag_id => ({ drama_id: id.value, tag_id })))
  }
  message.value = '短剧已保存'
  await refreshDrama()
  await refreshLinked()
}

async function onCoverSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const path = `${id.value}/${Date.now()}-${file.name}`
  const { error } = await client.storage.from('posters').upload(path, file, { upsert: true })
  if (error) return alert(error.message)
  form.cover_url = client.storage.from('posters').getPublicUrl(path).data.publicUrl
}

async function addEpisode() {
  const price = episodeForm.is_free ? 0 : Number(episodeForm.coin_price || 0)
  const { data, error } = await client.from('episodes').insert({
    drama_id: id.value,
    episode_number: episodeForm.episode_number,
    title: episodeForm.title || `Episode ${episodeForm.episode_number}`,
    coin_price: price,
    is_free: price <= 0,
    video_url: videoForms.en || null,
  }).select('id').single()
  if (error) return alert(error.message)

  const rows = LOCALES
    .map(l => ({ episode_id: data.id, locale: l.code, video_url: videoForms[l.code]?.trim() }))
    .filter(r => r.video_url)
  if (rows.length) {
    const { error: vErr } = await client.from('episode_videos').upsert(rows, { onConflict: 'episode_id,locale' })
    if (vErr) alert(vErr.message)
  }
  episodeForm.episode_number += 1
  episodeForm.title = ''
  LOCALES.forEach(l => { videoForms[l.code] = '' })
  await refreshEpisodes()
}

async function removeEpisode(episodeId: string) {
  const { error } = await client.from('episodes').delete().eq('id', episodeId)
  if (error) return alert(error.message)
  await refreshEpisodes()
}

const editingVideos = ref<Record<string, Record<string, string>>>({})
async function loadVideos(episodeId: string) {
  const { data } = await client.from('episode_videos').select('*').eq('episode_id', episodeId)
  const map: Record<string, string> = { fr: '', pt: '', ja: '', es: '', en: '' }
  ;(data || []).forEach((v: any) => { map[v.locale] = v.video_url })
  editingVideos.value[episodeId] = map
}
async function saveVideos(episodeId: string) {
  const map = editingVideos.value[episodeId] || {}
  const rows = LOCALES.map(l => ({ episode_id: episodeId, locale: l.code, video_url: map[l.code]?.trim() })).filter(r => r.video_url)
  await client.from('episode_videos').delete().eq('episode_id', episodeId)
  if (rows.length) {
    const { error } = await client.from('episode_videos').insert(rows)
    if (error) return alert(error.message)
  }
  const en = map.en || rows[0]?.video_url || null
  await client.from('episodes').update({ video_url: en }).eq('id', episodeId)
  alert('多语言视频已保存')
}

async function updatePrice(ep: any) {
  const price = Number(ep.coin_price || 0)
  await client.from('episodes').update({ coin_price: price, is_free: price <= 0 }).eq('id', ep.id)
}
</script>

<template>
  <AdminShell>
    <div class="stack">
      <h1 style="margin:0;">编辑短剧</h1>
      <div class="card stack">
        <label>标题<input v-model="form.title" class="input"></label>
        <label>Slug<input v-model="form.slug" class="input"></label>
        <label>简介<textarea v-model="form.synopsis" class="textarea" /></label>
        <label>封面 URL<input v-model="form.cover_url" class="input"></label>
        <label>上传封面<input type="file" accept="image/*" @change="onCoverSelected"></label>
        <label>状态
          <select v-model="form.status" class="select">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label class="row"><input v-model="form.is_trending" type="checkbox"> 热门</label>
        <div class="stack">
          <div class="muted">标签</div>
          <label v-for="t in tags" :key="t.id" class="row">
            <input v-model="selectedTags" type="checkbox" :value="t.id"> {{ t.name }}
          </label>
        </div>
        <button class="btn" @click="saveDrama">保存短剧</button>
        <p v-if="message" class="success">{{ message }}</p>
      </div>

      <div class="card stack">
        <h2 style="margin:0;">分集 / 金币 / 多语言视频</h2>
        <div v-for="ep in episodes" :key="ep.id" class="card stack" style="background:#12161f;">
          <div class="row" style="justify-content:space-between;">
            <strong>EP{{ ep.episode_number }} · {{ ep.title }}</strong>
            <button class="btn secondary" @click="removeEpisode(ep.id)">删除</button>
          </div>
          <div class="row">
            <label style="min-width:160px;">金币消耗
              <input v-model.number="ep.coin_price" class="input" type="number" min="0" @change="updatePrice(ep)">
            </label>
            <span class="muted">{{ Number(ep.coin_price) > 0 ? `需 ${ep.coin_price} 金币` : '免费' }}</span>
          </div>
          <button class="btn secondary" @click="loadVideos(ep.id)">编辑多语言视频</button>
          <div v-if="editingVideos[ep.id]" class="stack">
            <label v-for="l in LOCALES" :key="l.code">{{ l.label }} ({{ l.code }})
              <input v-model="editingVideos[ep.id][l.code]" class="input" placeholder="https://...mp4">
            </label>
            <button class="btn" @click="saveVideos(ep.id)">保存语种视频</button>
          </div>
        </div>

        <h3>新增分集</h3>
        <label>集数<input v-model.number="episodeForm.episode_number" class="input" type="number" min="1"></label>
        <label>标题<input v-model="episodeForm.title" class="input"></label>
        <label class="row"><input v-model="episodeForm.is_free" type="checkbox"> 免费</label>
        <label v-if="!episodeForm.is_free">金币价<input v-model.number="episodeForm.coin_price" class="input" type="number" min="1"></label>
        <div class="stack">
          <div class="muted">多语言视频 URL（法语/葡语/日语/西语/英语）</div>
          <label v-for="l in LOCALES" :key="l.code">{{ l.label }}
            <input v-model="videoForms[l.code]" class="input" :placeholder="`${l.code} video url`">
          </label>
        </div>
        <button class="btn" @click="addEpisode">添加分集</button>
      </div>
    </div>
  </AdminShell>
</template>
