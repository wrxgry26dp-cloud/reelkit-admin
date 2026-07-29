<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const { data, refresh } = await useAsyncData('customers', async () => {
  const { data, error } = await client
    .from('profiles')
    .select('id,email,username,display_name,client_source,coin_balance,status,created_at')
    .eq('is_customer', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
})

const adjust = reactive({ userId: '', amount: 100, note: '后台调整' })
async function openAdjust(id: string) {
  adjust.userId = id
  adjust.amount = 100
}
async function submitAdjust() {
  const { error } = await client.rpc('admin_adjust_coins', {
    p_user_id: adjust.userId,
    p_amount: Number(adjust.amount),
    p_note: adjust.note,
  })
  if (error) return alert(error.message)
  adjust.userId = ''
  await refresh()
  alert('余额已更新')
}
</script>

<template>
  <AdminShell>
    <div class="stack">
      <h1 style="margin:0;">客户管理</h1>
      <p class="muted">PC / H5 注册用户，含来源标识与金币余额</p>
      <div class="card">
        <table class="table">
          <thead>
            <tr><th>用户</th><th>来源</th><th>金币</th><th>状态</th><th>注册时间</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="c in data" :key="c.id">
              <td>
                <div>{{ c.display_name || c.username || '—' }}</div>
                <div class="muted">{{ c.email }}</div>
              </td>
              <td><span class="badge">{{ c.client_source || 'unknown' }}</span></td>
              <td>{{ c.coin_balance }}</td>
              <td>{{ c.status }}</td>
              <td class="muted">{{ new Date(c.created_at).toLocaleString() }}</td>
              <td><button class="btn secondary" @click="openAdjust(c.id)">改余额</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="adjust.userId" class="card stack">
        <h2 style="margin:0;">调整金币（可正可负）</h2>
        <input v-model.number="adjust.amount" class="input" type="number">
        <input v-model="adjust.note" class="input" placeholder="备注">
        <div class="row">
          <button class="btn" @click="submitAdjust">提交</button>
          <button class="btn secondary" @click="adjust.userId = ''">取消</button>
        </div>
      </div>
    </div>
  </AdminShell>
</template>
