<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const { data } = await useAsyncData('menus-page', async () => {
  const { data, error } = await client.from('menus').select('*').order('sort_order')
  if (error) throw error
  return data || []
})
</script>

<template>
  <AdminShell>
    <div class="stack">
      <h1 style="margin:0;">菜单权限</h1>
      <div class="card">
        <table class="table">
          <thead><tr><th>名称</th><th>编码</th><th>路径</th><th>排序</th></tr></thead>
          <tbody>
            <tr v-for="m in data" :key="m.id">
              <td>{{ m.name }}</td>
              <td>{{ m.code }}</td>
              <td>{{ m.path || '—' }}</td>
              <td>{{ m.sort_order }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminShell>
</template>
