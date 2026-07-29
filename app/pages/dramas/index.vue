<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const search = ref('')
const statusFilter = ref('all')
const { data, refresh } = await useAsyncData('dramas-admin', async () => {
  const { data, error } = await client.from('dramas').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
})
const filtered = computed(() => (data.value || []).filter((d: any) => {
  const text = search.value.trim().toLowerCase()
  const matchesText = !text || d.title.toLowerCase().includes(text) || d.slug.toLowerCase().includes(text)
  const matchesStatus = statusFilter.value === 'all' || d.status === statusFilter.value
  return matchesText && matchesStatus
}))
async function removeDrama(id: string) {
  if (!confirm('确认删除该剧及分集？')) return
  const { error } = await client.from('dramas').delete().eq('id', id)
  if (error) return alert(error.message)
  await refresh()
}
</script>

<template>
  <AdminShell>
    <div>
      <div class="breadcrumbs">内容运营 / 短剧管理</div>
      <div class="page-head">
        <div>
          <h1>短剧管理</h1>
          <div class="muted">维护短剧资料、封面、分集、多语言视频和发布状态。</div>
        </div>
        <NuxtLink class="btn" to="/dramas/new">新增短剧</NuxtLink>
      </div>
      <div class="card toolbar" style="margin-bottom:14px;">
        <input v-model="search" class="input" placeholder="搜索标题或 Slug">
        <select v-model="statusFilter" class="select">
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
        <span class="muted">共 {{ filtered.length }} 部</span>
      </div>
      <div class="card">
        <table class="table">
          <thead><tr><th>封面</th><th>短剧</th><th>状态</th><th>运营标签</th><th>更新时间</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in filtered" :key="d.id">
              <td><img v-if="d.cover_url" :src="d.cover_url" class="cover-cell" alt=""></td>
              <td>
                <strong>{{ d.title }}</strong>
                <div class="muted">{{ d.slug }}</div>
              </td>
              <td><span class="badge" :class="d.status === 'published' ? 'ok' : 'warn'">{{ d.status }}</span></td>
              <td><span v-if="d.is_trending" class="badge">热门</span><span v-else class="muted">—</span></td>
              <td class="muted">{{ new Date(d.updated_at).toLocaleString() }}</td>
              <td class="row">
                <NuxtLink class="btn secondary" :to="`/dramas/${d.id}`">管理</NuxtLink>
                <button class="btn danger" @click="removeDrama(d.id)">删除</button>
              </td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="6" class="empty">没有符合条件的短剧</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminShell>
</template>
