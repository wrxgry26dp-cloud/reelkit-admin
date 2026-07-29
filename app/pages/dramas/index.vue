<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const { data, refresh } = await useAsyncData('dramas-admin', async () => {
  const { data, error } = await client.from('dramas').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
})
async function removeDrama(id: string) {
  if (!confirm('确认删除该剧及分集？')) return
  const { error } = await client.from('dramas').delete().eq('id', id)
  if (error) return alert(error.message)
  await refresh()
}
</script>

<template>
  <AdminShell>
    <div class="stack">
      <div class="row" style="justify-content:space-between;">
        <h1 style="margin:0;">剧集列表</h1>
        <NuxtLink class="btn" to="/dramas/new">新增短剧</NuxtLink>
      </div>
      <div class="card">
        <table class="table">
          <thead><tr><th>标题</th><th>状态</th><th>热门</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in data" :key="d.id">
              <td>
                <div>{{ d.title }}</div>
                <div class="muted">{{ d.slug }}</div>
              </td>
              <td><span class="badge" :class="d.status === 'published' ? 'ok' : 'warn'">{{ d.status }}</span></td>
              <td>{{ d.is_trending ? '是' : '否' }}</td>
              <td class="row">
                <NuxtLink class="btn secondary" :to="`/dramas/${d.id}`">编辑/分集</NuxtLink>
                <button class="btn secondary" @click="removeDrama(d.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminShell>
</template>
