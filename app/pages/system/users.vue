<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const { data, refresh } = await useAsyncData('staff-users', async () => {
  const { data, error } = await client
    .from('profiles')
    .select('id,email,username,display_name,role,status,created_at')
    .eq('is_customer', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
})

async function toggleStatus(id: string, status: string) {
  const next = status === 'active' ? 'disabled' : 'active'
  const { error } = await client.from('profiles').update({ status: next }).eq('id', id)
  if (error) return alert(error.message)
  await refresh()
}
</script>

<template>
  <AdminShell>
    <div class="stack">
      <h1 style="margin:0;">用户管理（后台账号）</h1>
      <p class="muted">管理端工作人员账号。客户请在「客户管理」查看。</p>
      <div class="card">
        <table class="table">
          <thead><tr><th>账号</th><th>邮箱</th><th>角色</th><th>状态</th><th></th></tr></thead>
          <tbody>
            <tr v-for="u in data" :key="u.id">
              <td>{{ u.username || u.display_name }}</td>
              <td>{{ u.email }}</td>
              <td><span class="badge">{{ u.role }}</span></td>
              <td><span class="badge" :class="u.status === 'active' ? 'ok' : 'warn'">{{ u.status }}</span></td>
              <td><button class="btn secondary" @click="toggleStatus(u.id, u.status)">{{ u.status === 'active' ? '禁用' : '启用' }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminShell>
</template>
