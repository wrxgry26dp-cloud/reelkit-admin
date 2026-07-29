<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const client = useSupabaseClient()
const form = reactive({
  title: '',
  slug: '',
  synopsis: '',
  status: 'draft',
  is_trending: false,
  cover_url: '',
  tags: '',
})
const message = ref('')
const saving = ref(false)

watch(() => form.title, (title) => {
  if (!form.slug) {
    form.slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }
})

async function save() {
  saving.value = true
  message.value = ''
  const { data, error } = await client
    .from('dramas')
    .insert({
      title: form.title.trim(),
      slug: form.slug.trim(),
      synopsis: form.synopsis.trim(),
      status: form.status,
      is_trending: form.is_trending,
      cover_url: form.cover_url.trim() || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    .select('id')
    .single()
  saving.value = false
  if (error) {
    message.value = error.message
    return
  }
  await navigateTo(`/dramas/${data.id}`)
}
</script>

<template>
  <div>
    <nav class="nav">
      <strong>ReelKit Admin</strong>
      <NuxtLink to="/dramas">Dramas</NuxtLink>
    </nav>
    <div class="container stack" style="max-width: 720px;">
      <h1>New drama</h1>
      <div class="card stack">
        <label>Title<input v-model="form.title" class="input"></label>
        <label>Slug<input v-model="form.slug" class="input"></label>
        <label>Synopsis<textarea v-model="form.synopsis" class="textarea" /></label>
        <label>Cover URL<input v-model="form.cover_url" class="input" placeholder="https://..."></label>
        <label>Tags (comma separated)<input v-model="form.tags" class="input"></label>
        <label>Status
          <select v-model="form.status" class="select">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label class="row"><input v-model="form.is_trending" type="checkbox"> Trending</label>
        <button class="btn" :disabled="saving || !form.title || !form.slug" @click="save">Create</button>
        <p v-if="message" class="error">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
