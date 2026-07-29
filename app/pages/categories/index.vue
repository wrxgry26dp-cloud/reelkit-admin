<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const client = useSupabaseClient()
const { data, refresh } = await useAsyncData('categories', async () => {
  const { data, error } = await client.from('categories').select('*').order('sort_order')
  if (error) throw error
  return data || []
})

const form = reactive({ name: '', slug: '', sort_order: 0 })

async function addCategory() {
  const { error } = await client.from('categories').insert({
    name: form.name.trim(),
    slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-'),
    sort_order: form.sort_order,
  })
  if (error) return alert(error.message)
  form.name = ''
  form.slug = ''
  await refresh()
}
</script>

<template>
  <AdminShell>
    <div class="breadcrumbs">内容运营 / 分类管理</div>
    <div class="page-head">
      <div>
        <h1>分类管理</h1>
        <div class="muted">用于用户端分类筛选与运营分组。</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:14px;">
      <table class="table">
        <thead><tr><th>名称</th><th>Slug</th><th>排序</th></tr></thead>
        <tbody>
          <tr v-for="c in data" :key="c.id">
            <td>{{ c.name }}</td>
            <td>{{ c.slug }}</td>
            <td>{{ c.sort_order }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="card stack">
      <h2 style="margin:0;">新增分类</h2>
      <input v-model="form.name" class="input" placeholder="名称">
      <input v-model="form.slug" class="input" placeholder="slug">
      <input v-model.number="form.sort_order" class="input" type="number" placeholder="排序">
      <button class="btn" @click="addCategory">添加</button>
    </div>
  </AdminShell>
</template>
