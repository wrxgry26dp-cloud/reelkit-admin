<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const { data, refresh } = await useAsyncData('tags', async () => {
  const { data, error } = await client.from('tags').select('*').order('sort_order')
  if (error) throw error
  return data || []
})
const form = reactive({ name: '', slug: '', sort_order: 0 })
async function addTag() {
  const { error } = await client.from('tags').insert({
    name: form.name.trim(),
    slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-'),
    sort_order: form.sort_order,
  })
  if (error) return alert(error.message)
  form.name = ''
  form.slug = ''
  await refresh()
}
async function removeTag(id: string) {
  const { error } = await client.from('tags').delete().eq('id', id)
  if (error) return alert(error.message)
  await refresh()
}
</script>

<template>
  <AdminShell>
    <div class="stack">
      <h1 style="margin:0;">标签管理</h1>
      <p class="muted">如：热门、新上架、配音等</p>
      <div class="card">
        <table class="table">
          <thead><tr><th>名称</th><th>Slug</th><th>排序</th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in data" :key="t.id">
              <td>{{ t.name }}</td>
              <td>{{ t.slug }}</td>
              <td>{{ t.sort_order }}</td>
              <td><button class="btn secondary" @click="removeTag(t.id)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card stack">
        <h2 style="margin:0;">新增标签</h2>
        <input v-model="form.name" class="input" placeholder="名称">
        <input v-model="form.slug" class="input" placeholder="slug">
        <input v-model.number="form.sort_order" class="input" type="number" placeholder="排序">
        <button class="btn" @click="addTag">添加</button>
      </div>
    </div>
  </AdminShell>
</template>
