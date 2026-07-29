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
})
const message = ref('')
watch(() => form.title, (t) => {
  if (!form.slug) form.slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
})
async function save() {
  const { data, error } = await client.from('dramas').insert({
    title: form.title.trim(),
    slug: form.slug.trim(),
    synopsis: form.synopsis.trim(),
    status: form.status,
    is_trending: form.is_trending,
    cover_url: form.cover_url.trim() || null,
  }).select('id').single()
  if (error) { message.value = error.message; return }
  await navigateTo(`/dramas/${data.id}`)
}
</script>

<template>
  <AdminShell>
    <div class="stack" style="max-width:720px;">
      <h1 style="margin:0;">新增短剧</h1>
      <div class="card stack">
        <label>标题<input v-model="form.title" class="input"></label>
        <label>Slug<input v-model="form.slug" class="input"></label>
        <label>简介<textarea v-model="form.synopsis" class="textarea" /></label>
        <label>封面 URL<input v-model="form.cover_url" class="input"></label>
        <label>状态
          <select v-model="form.status" class="select">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label class="row"><input v-model="form.is_trending" type="checkbox"> 标记热门</label>
        <button class="btn" :disabled="!form.title || !form.slug" @click="save">创建并编辑分集</button>
        <p v-if="message" class="error">{{ message }}</p>
      </div>
    </div>
  </AdminShell>
</template>
