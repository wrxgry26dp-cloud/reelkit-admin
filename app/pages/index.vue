<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const [{ count: dramas }, { count: customers }, { count: plays }, { count: spends }] = await Promise.all([
  client.from('dramas').select('*', { count: 'exact', head: true }),
  client.from('profiles').select('*', { count: 'exact', head: true }).eq('is_customer', true),
  client.from('play_events').select('*', { count: 'exact', head: true }),
  client.from('coin_transactions').select('*', { count: 'exact', head: true }).eq('type', 'play_unlock'),
])
</script>

<template>
  <AdminShell>
    <div class="stack">
      <h1 style="margin:0;">仪表盘</h1>
      <div class="row">
        <div class="card stat"><div class="muted">短剧数</div><div class="n">{{ dramas ?? 0 }}</div></div>
        <div class="card stat"><div class="muted">注册客户</div><div class="n">{{ customers ?? 0 }}</div></div>
        <div class="card stat"><div class="muted">播放次数</div><div class="n">{{ plays ?? 0 }}</div></div>
        <div class="card stat"><div class="muted">消费笔数</div><div class="n">{{ spends ?? 0 }}</div></div>
      </div>
      <NuxtLink class="btn" to="/dramas/new">新增短剧</NuxtLink>
    </div>
  </AdminShell>
</template>
