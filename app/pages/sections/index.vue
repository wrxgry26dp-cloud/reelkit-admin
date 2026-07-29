<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const client = useSupabaseClient()

const { data: sections, refresh } = await useAsyncData('sections', async () => {
  const { data, error } = await client.from('home_sections').select('*').order('sort_order')
  if (error) throw error
  return data || []
})

const { data: dramas } = await useAsyncData('all-dramas', async () => {
  const { data, error } = await client.from('dramas').select('id,title,status').order('title')
  if (error) throw error
  return data || []
})

const form = reactive({ title: '', slug: '', sort_order: 0 })
const itemForm = reactive({ section_id: '', drama_id: '', sort_order: 0 })

async function addSection() {
  const { error } = await client.from('home_sections').insert({
    title: form.title.trim(),
    slug: form.slug.trim() || form.title.trim().toLowerCase().replace(/\s+/g, '-'),
    sort_order: form.sort_order,
    is_active: true,
  })
  if (error) return alert(error.message)
  form.title = ''
  form.slug = ''
  await refresh()
}

async function addItem() {
  const { error } = await client.from('home_section_items').insert({
    section_id: itemForm.section_id,
    drama_id: itemForm.drama_id,
    sort_order: itemForm.sort_order,
  })
  if (error) return alert(error.message)
  alert('已加入首页区块')
}
</script>

<template>
  <AdminShell>
    <div class="breadcrumbs">内容运营 / 首页编排</div>
    <div class="page-head">
      <div>
        <h1>首页编排</h1>
        <div class="muted">配置首页横滑区块，以及区块内展示的短剧。</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <table class="table">
        <thead><tr><th>标题</th><th>Slug</th><th>排序</th><th>启用</th></tr></thead>
        <tbody>
          <tr v-for="s in sections" :key="s.id">
            <td>{{ s.title }}</td>
            <td>{{ s.slug }}</td>
            <td>{{ s.sort_order }}</td>
            <td>{{ s.is_active ? '是' : '否' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card stack" style="margin-bottom:14px;">
      <h2 style="margin:0;">新增区块</h2>
      <input v-model="form.title" class="input" placeholder="标题">
      <input v-model="form.slug" class="input" placeholder="slug">
      <input v-model.number="form.sort_order" class="input" type="number" placeholder="排序">
      <button class="btn" @click="addSection">添加区块</button>
    </div>

    <div class="card stack">
      <h2 style="margin:0;">把短剧加入区块</h2>
      <select v-model="itemForm.section_id" class="select">
        <option disabled value="">选择区块</option>
        <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.title }}</option>
      </select>
      <select v-model="itemForm.drama_id" class="select">
        <option disabled value="">选择短剧</option>
        <option v-for="d in dramas" :key="d.id" :value="d.id">{{ d.title }} ({{ d.status }})</option>
      </select>
      <input v-model.number="itemForm.sort_order" class="input" type="number" placeholder="排序">
      <button class="btn" :disabled="!itemForm.section_id || !itemForm.drama_id" @click="addItem">加入</button>
    </div>
  </AdminShell>
</template>
