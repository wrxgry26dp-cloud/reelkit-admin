<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()

const { count: customerCount } = await client.from('profiles').select('*', { count: 'exact', head: true }).eq('is_customer', true)

const { data: ranking } = await useAsyncData('play-rank', async () => {
  const { data, error } = await client.from('play_events').select('drama_id, dramas(title)')
  if (error) throw error
  const map = new Map<string, { title: string, count: number }>()
  for (const row of data || []) {
    const id = (row as any).drama_id
    const title = (row as any).dramas?.title || id
    const cur = map.get(id) || { title, count: 0 }
    cur.count += 1
    map.set(id, cur)
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 20)
})

const { data: spends } = await useAsyncData('spends', async () => {
  const { data, error } = await client
    .from('coin_transactions')
    .select('id,user_id,amount,balance_after,type,note,created_at, profiles(email,username)')
    .eq('type', 'play_unlock')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
})
</script>

<template>
  <AdminShell>
    <div class="stack">
      <h1 style="margin:0;">统计模块</h1>
      <div class="card stat"><div class="muted">注册客户数</div><div class="n">{{ customerCount ?? 0 }}</div></div>

      <div class="card stack">
        <h2 style="margin:0;">短剧播放排行</h2>
        <table class="table">
          <thead><tr><th>短剧</th><th>播放次数</th></tr></thead>
          <tbody>
            <tr v-for="r in ranking" :key="r.title">
              <td>{{ r.title }}</td>
              <td>{{ r.count }}</td>
            </tr>
            <tr v-if="!ranking?.length"><td colspan="2" class="muted">暂无播放数据</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card stack">
        <h2 style="margin:0;">消费记录（播放解锁扣费）</h2>
        <table class="table">
          <thead><tr><th>用户</th><th>变动</th><th>余额</th><th>时间</th><th>备注</th></tr></thead>
          <tbody>
            <tr v-for="s in spends" :key="s.id">
              <td>{{ (s as any).profiles?.email || (s as any).profiles?.username || s.user_id }}</td>
              <td>{{ s.amount }}</td>
              <td>{{ s.balance_after }}</td>
              <td class="muted">{{ new Date(s.created_at).toLocaleString() }}</td>
              <td class="muted">{{ s.note }}</td>
            </tr>
            <tr v-if="!spends?.length"><td colspan="5" class="muted">暂无消费记录</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminShell>
</template>
