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
const message = ref('')
const activeTab = ref<'details' | 'episodes' | 'publish'>('details')
const expandedEpisode = ref<string | null>(null)
const uploading = reactive<Record<string, boolean>>({})
const videoAssets = ref<any[]>([])

async function refreshVideoAssets() {
  const episodeIds = (episodes.value || []).map((ep: any) => ep.id)
  if (!episodeIds.length) {
    videoAssets.value = []
    return
  }
  const { data, error } = await client.from('episode_videos').select('*').in('episode_id', episodeIds)
  if (error) return (message.value = error.message)
  videoAssets.value = data || []
}

watch(episodes, refreshVideoAssets, { immediate: true })

function assetFor(episodeId: string, locale: string) {
  return videoAssets.value.find((item: any) => item.episode_id === episodeId && item.locale === locale)
}

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
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    message.value = '封面仅支持 JPG、PNG、WebP，最大 10MB'
    return
  }
  const oldPath = (drama.value as any)?.cover_path
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${id.value}/cover-${Date.now()}.${ext}`
  const { error } = await client.storage.from('posters').upload(path, file, { contentType: file.type })
  if (error) return (message.value = error.message)
  form.cover_url = client.storage.from('posters').getPublicUrl(path).data.publicUrl
  const { error: updateError } = await client.from('dramas').update({
    cover_url: form.cover_url,
    cover_path: path,
    updated_at: new Date().toISOString(),
  }).eq('id', id.value)
  if (updateError) return (message.value = updateError.message)
  if (oldPath && oldPath !== path) await client.storage.from('posters').remove([oldPath])
  await refreshDrama()
  message.value = '封面已上传并保存'
}

async function addEpisode() {
  const price = episodeForm.is_free ? 0 : Number(episodeForm.coin_price || 0)
  const { data, error } = await client.from('episodes').insert({
    drama_id: id.value,
    episode_number: episodeForm.episode_number,
    title: episodeForm.title || `Episode ${episodeForm.episode_number}`,
    coin_price: price,
    is_free: price <= 0,
    video_url: null,
  }).select('id').single()
  if (error) return alert(error.message)
  episodeForm.episode_number += 1
  episodeForm.title = ''
  await refreshEpisodes()
  expandedEpisode.value = data.id
  activeTab.value = 'episodes'
}

async function removeEpisode(episodeId: string) {
  const { error } = await client.from('episodes').delete().eq('id', episodeId)
  if (error) return alert(error.message)
  await refreshEpisodes()
}

async function uploadVideo(episodeId: string, locale: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'].includes(file.type)) {
    message.value = '视频仅支持 MP4、WebM、MOV、M4V'
    input.value = ''
    return
  }
  if (file.size > 500 * 1024 * 1024) {
    message.value = '单个视频不能超过 500MB'
    input.value = ''
    return
  }
  const key = `${episodeId}-${locale}`
  uploading[key] = true
  message.value = ''
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${id.value}/${episodeId}/${locale}/${Date.now()}-${safeName}`
  const oldAsset = assetFor(episodeId, locale)
  const { error: uploadError } = await client.storage.from('videos').upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: '3600',
  })
  if (uploadError) {
    uploading[key] = false
    input.value = ''
    message.value = `上传失败：${uploadError.message}`
    return
  }
  const { error: rowError } = await client.from('episode_videos').upsert({
    episode_id: episodeId,
    locale,
    video_url: null,
    storage_path: path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'episode_id,locale' })
  if (rowError) {
    await client.storage.from('videos').remove([path])
    uploading[key] = false
    input.value = ''
    message.value = rowError.message
    return
  }
  if (oldAsset?.storage_path && oldAsset.storage_path !== path) {
    await client.storage.from('videos').remove([oldAsset.storage_path])
  }
  uploading[key] = false
  input.value = ''
  await refreshVideoAssets()
  message.value = `${LOCALES.find(l => l.code === locale)?.label}视频上传完成`
}

async function removeVideo(episodeId: string, locale: string) {
  const asset = assetFor(episodeId, locale)
  if (!asset || !confirm(`确认删除${LOCALES.find(l => l.code === locale)?.label}视频？`)) return
  if (asset.storage_path) await client.storage.from('videos').remove([asset.storage_path])
  const { error } = await client.from('episode_videos').delete().eq('id', asset.id)
  if (error) return (message.value = error.message)
  await refreshVideoAssets()
}

async function updatePrice(ep: any) {
  const price = Number(ep.coin_price || 0)
  await client.from('episodes').update({ coin_price: price, is_free: price <= 0 }).eq('id', ep.id)
}

async function publishDrama() {
  const currentEpisodes = episodes.value || []
  if (!form.cover_url) return (message.value = '发布前必须上传封面')
  if (!currentEpisodes.length) return (message.value = '发布前至少创建一个分集')
  const missing = currentEpisodes.filter((ep: any) => !videoAssets.value.some((v: any) => v.episode_id === ep.id))
  if (missing.length) return (message.value = `以下分集尚未上传任何语种视频：${missing.map((ep: any) => `EP${ep.episode_number}`).join('、')}`)
  const { error } = await client.from('dramas').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', id.value)
  if (error) return (message.value = error.message)
  form.status = 'published'
  message.value = '短剧已发布'
  await refreshDrama()
}
</script>

<template>
  <AdminShell>
    <div>
      <div class="breadcrumbs">内容运营 / 短剧管理 / {{ drama?.title }}</div>
      <div class="page-head">
        <div>
          <h1>{{ drama?.title }}</h1>
          <div class="row">
            <span class="badge" :class="form.status === 'published' ? 'ok' : 'warn'">{{ form.status }}</span>
            <span class="muted">{{ episodes?.length || 0 }} 个分集</span>
          </div>
        </div>
        <div class="row">
          <NuxtLink class="btn ghost" to="/dramas">返回列表</NuxtLink>
          <button v-if="form.status !== 'published'" class="btn" @click="activeTab = 'publish'">去发布</button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'details' }" @click="activeTab = 'details'">基础资料</button>
        <button class="tab" :class="{ active: activeTab === 'episodes' }" @click="activeTab = 'episodes'">分集与多语视频</button>
        <button class="tab" :class="{ active: activeTab === 'publish' }" @click="activeTab = 'publish'">发布检查</button>
      </div>

      <section v-if="activeTab === 'details'" class="card">
        <div class="form-grid">
          <label class="field">
            <span class="field-label required">短剧标题</span>
            <input v-model="form.title" class="input">
          </label>
          <label class="field">
            <span class="field-label required">Slug</span>
            <input v-model="form.slug" class="input">
          </label>
          <label class="field form-span">
            <span class="field-label required">剧情简介</span>
            <textarea v-model="form.synopsis" class="textarea" />
          </label>
          <div class="field">
            <span class="field-label">竖版封面</span>
            <label class="upload-zone">
              <img v-if="form.cover_url" :src="form.cover_url" class="upload-preview" alt="封面">
              <span>{{ form.cover_url ? '点击更换本地封面' : '点击上传本地封面' }}</span>
              <span class="muted">JPG / PNG / WebP，建议 2:3，最大 10MB</span>
              <input hidden type="file" accept="image/jpeg,image/png,image/webp" @change="onCoverSelected">
            </label>
          </div>
          <div class="field">
            <span class="field-label">运营标签</span>
            <label v-for="t in tags" :key="t.id" class="row">
              <input v-model="selectedTags" type="checkbox" :value="t.id"> {{ t.name }}
            </label>
            <label class="row"><input v-model="form.is_trending" type="checkbox"> 首页显示热门角标</label>
          </div>
        </div>
        <div class="row" style="justify-content:flex-end; margin-top:20px;">
          <button class="btn" @click="saveDrama">保存基础资料</button>
        </div>
      </section>

      <section v-if="activeTab === 'episodes'" class="stack">
        <div class="card">
          <div class="page-head" style="margin-bottom:14px;">
            <div><h2 style="margin:0 0 6px;">新增分集</h2><div class="muted">先创建分集，再为该集上传各语种视频。</div></div>
          </div>
          <div class="form-grid">
            <label class="field"><span class="field-label">集数</span><input v-model.number="episodeForm.episode_number" class="input" type="number" min="1"></label>
            <label class="field"><span class="field-label">分集标题</span><input v-model="episodeForm.title" class="input" placeholder="留空则自动生成"></label>
            <label class="field"><span class="field-label">播放权限</span>
              <select v-model="episodeForm.is_free" class="select">
                <option :value="true">免费</option>
                <option :value="false">金币解锁</option>
              </select>
            </label>
            <label v-if="!episodeForm.is_free" class="field"><span class="field-label">所需金币</span><input v-model.number="episodeForm.coin_price" class="input" type="number" min="1"></label>
          </div>
          <div class="row" style="justify-content:flex-end; margin-top:16px;"><button class="btn" @click="addEpisode">创建分集</button></div>
        </div>

        <div v-for="ep in episodes" :key="ep.id" class="episode-card">
          <div class="episode-head" @click="expandedEpisode = expandedEpisode === ep.id ? null : ep.id">
            <div>
              <strong>EP{{ ep.episode_number }} · {{ ep.title }}</strong>
              <div class="muted">{{ videoAssets.filter(v => v.episode_id === ep.id).length }}/5 个语种已上传</div>
            </div>
            <div class="row">
              <span class="badge" :class="Number(ep.coin_price) > 0 ? 'warn' : 'ok'">{{ Number(ep.coin_price) > 0 ? `${ep.coin_price} 金币` : '免费' }}</span>
              <span>{{ expandedEpisode === ep.id ? '收起' : '配置媒资' }}</span>
            </div>
          </div>
          <div v-if="expandedEpisode === ep.id" class="episode-body stack">
            <div class="row">
              <label class="field" style="width:180px;"><span class="field-label">金币消耗</span><input v-model.number="ep.coin_price" class="input" type="number" min="0" @change="updatePrice(ep)"></label>
              <span class="muted">设为 0 即免费；收费集首次扣费后永久解锁。</span>
            </div>
            <div>
              <div class="field-label" style="margin-bottom:10px;">本地视频上传</div>
              <div class="media-grid">
                <div v-for="l in LOCALES" :key="l.code" class="media-slot" :class="{ ready: assetFor(ep.id, l.code) }">
                  <strong>{{ l.label }}</strong>
                  <template v-if="assetFor(ep.id, l.code)">
                    <div class="file-meta" :title="assetFor(ep.id, l.code).file_name || assetFor(ep.id, l.code).video_url">
                      {{ assetFor(ep.id, l.code).file_name || '历史外链视频' }}
                    </div>
                    <div v-if="assetFor(ep.id, l.code).file_size" class="file-meta">{{ (assetFor(ep.id, l.code).file_size / 1024 / 1024).toFixed(1) }} MB</div>
                  </template>
                  <div v-else class="file-meta">未上传</div>
                  <label class="btn secondary" style="margin-top:10px;">
                    {{ uploading[`${ep.id}-${l.code}`] ? '上传中…' : (assetFor(ep.id, l.code) ? '替换' : '选择文件') }}
                    <input hidden type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" :disabled="uploading[`${ep.id}-${l.code}`]" @change="uploadVideo(ep.id, l.code, $event)">
                  </label>
                  <button v-if="assetFor(ep.id, l.code)" class="btn danger" style="margin-top:8px;" @click="removeVideo(ep.id, l.code)">删除</button>
                </div>
              </div>
              <div class="muted" style="margin-top:10px;">支持 MP4 / WebM / MOV / M4V，单文件最大 500MB。视频存入私有 Storage。</div>
            </div>
            <div class="row" style="justify-content:flex-end;"><button class="btn danger" @click="removeEpisode(ep.id)">删除该分集</button></div>
          </div>
        </div>
        <div v-if="!episodes?.length" class="card empty">尚未创建分集</div>
      </section>

      <section v-if="activeTab === 'publish'" class="card stack">
        <h2 style="margin:0;">发布检查</h2>
        <div class="row"><span :class="form.cover_url ? 'success' : 'error'">{{ form.cover_url ? '✓' : '×' }}</span><span>已上传竖版封面</span></div>
        <div class="row"><span :class="episodes?.length ? 'success' : 'error'">{{ episodes?.length ? '✓' : '×' }}</span><span>至少包含一个分集</span></div>
        <div v-for="ep in episodes" :key="ep.id" class="row">
          <span :class="videoAssets.some(v => v.episode_id === ep.id) ? 'success' : 'error'">{{ videoAssets.some(v => v.episode_id === ep.id) ? '✓' : '×' }}</span>
          <span>EP{{ ep.episode_number }} 已上传至少一个语种视频</span>
        </div>
        <p class="muted">发布后 PC/H5 用户即可看到该短剧；收费视频仍受登录、金币和永久解锁策略保护。</p>
        <div class="row">
          <button class="btn" @click="publishDrama">{{ form.status === 'published' ? '重新发布更新' : '确认发布' }}</button>
          <button
            v-if="form.status === 'published'"
            class="btn ghost"
            @click="form.status = 'draft'; saveDrama()"
          >
            下架为草稿
          </button>
        </div>
      </section>
      <p
        v-if="message"
        :class="message.includes('失败') || message.includes('必须') || message.includes('尚未') ? 'error' : 'success'"
      >
        {{ message }}
      </p>
    </div>
  </AdminShell>
</template>
