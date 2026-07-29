<script setup lang="ts">
import type { Drama, Episode } from '~/types/database.types'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const client = useSupabaseClient()
const id = computed(() => String(route.params.id))

const { data: drama, refresh: refreshDrama } = await useAsyncData(`drama-${id.value}`, async () => {
  const { data, error } = await client.from('dramas').select('*').eq('id', id.value).single()
  if (error) throw error
  return data as Drama
})

const { data: episodes, refresh: refreshEpisodes } = await useAsyncData(`episodes-${id.value}`, async () => {
  const { data, error } = await client
    .from('episodes')
    .select('*')
    .eq('drama_id', id.value)
    .order('episode_number')
  if (error) throw error
  return data as Episode[]
})

const form = reactive({
  title: '',
  slug: '',
  synopsis: '',
  status: 'draft',
  is_trending: false,
  cover_url: '',
  tags: '',
})

watch(drama, (d) => {
  if (!d) return
  form.title = d.title
  form.slug = d.slug
  form.synopsis = d.synopsis
  form.status = d.status
  form.is_trending = d.is_trending
  form.cover_url = d.cover_url || ''
  form.tags = (d.tags || []).join(', ')
}, { immediate: true })

const episodeForm = reactive({
  episode_number: 1,
  title: '',
  video_url: '',
  duration_seconds: 60,
  is_free: true,
})

const message = ref('')
const saving = ref(false)

async function saveDrama() {
  saving.value = true
  message.value = ''
  const { error } = await client.from('dramas').update({
    title: form.title.trim(),
    slug: form.slug.trim(),
    synopsis: form.synopsis.trim(),
    status: form.status,
    is_trending: form.is_trending,
    cover_url: form.cover_url.trim() || null,
    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    updated_at: new Date().toISOString(),
  }).eq('id', id.value)
  saving.value = false
  if (error) {
    message.value = error.message
    return
  }
  message.value = 'Saved.'
  await refreshDrama()
}

async function addEpisode() {
  const { error } = await client.from('episodes').insert({
    drama_id: id.value,
    episode_number: episodeForm.episode_number,
    title: episodeForm.title || `Episode ${episodeForm.episode_number}`,
    video_url: episodeForm.video_url || null,
    duration_seconds: episodeForm.duration_seconds,
    is_free: episodeForm.is_free,
  })
  if (error) {
    alert(error.message)
    return
  }
  episodeForm.episode_number += 1
  episodeForm.title = ''
  await refreshEpisodes()
}

async function removeEpisode(episodeId: string) {
  const { error } = await client.from('episodes').delete().eq('id', episodeId)
  if (error) {
    alert(error.message)
    return
  }
  await refreshEpisodes()
}

async function onCoverSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const path = `${id.value}/${Date.now()}-${file.name}`
  const { error } = await client.storage.from('posters').upload(path, file, { upsert: true })
  if (error) {
    alert(error.message)
    return
  }
  const { data } = client.storage.from('posters').getPublicUrl(path)
  form.cover_url = data.publicUrl
}
</script>

<template>
  <div>
    <nav class="nav">
      <strong>ReelKit Admin</strong>
      <NuxtLink to="/dramas">Dramas</NuxtLink>
    </nav>
    <div class="container stack">
      <h1>Edit drama</h1>
      <div class="card stack">
        <label>Title<input v-model="form.title" class="input"></label>
        <label>Slug<input v-model="form.slug" class="input"></label>
        <label>Synopsis<textarea v-model="form.synopsis" class="textarea" /></label>
        <label>Cover URL<input v-model="form.cover_url" class="input"></label>
        <label>Upload cover<input type="file" accept="image/*" @change="onCoverSelected"></label>
        <label>Tags<input v-model="form.tags" class="input"></label>
        <label>Status
          <select v-model="form.status" class="select">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label class="row"><input v-model="form.is_trending" type="checkbox"> Trending</label>
        <button class="btn" :disabled="saving" @click="saveDrama">Save drama</button>
        <p v-if="message" class="success">{{ message }}</p>
      </div>

      <div class="card stack">
        <h2>Episodes</h2>
        <table class="table">
          <thead>
            <tr><th>#</th><th>Title</th><th>Video</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="ep in episodes" :key="ep.id">
              <td>{{ ep.episode_number }}</td>
              <td>{{ ep.title }}</td>
              <td class="muted">{{ ep.video_url || '—' }}</td>
              <td><button class="btn secondary" @click="removeEpisode(ep.id)">Delete</button></td>
            </tr>
          </tbody>
        </table>
        <div class="stack">
          <h3>Add episode</h3>
          <label>Number<input v-model.number="episodeForm.episode_number" class="input" type="number" min="1"></label>
          <label>Title<input v-model="episodeForm.title" class="input"></label>
          <label>Video URL<input v-model="episodeForm.video_url" class="input" placeholder="https://...mp4"></label>
          <label>Duration (sec)<input v-model.number="episodeForm.duration_seconds" class="input" type="number"></label>
          <label class="row"><input v-model="episodeForm.is_free" type="checkbox"> Free</label>
          <button class="btn" @click="addEpisode">Add episode</button>
        </div>
      </div>
    </div>
  </div>
</template>
