<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const { data: roles } = await useAsyncData('roles', async () => {
  const { data, error } = await client.from('roles').select('*').order('created_at')
  if (error) throw error
  return data || []
})
const { data: menus } = await useAsyncData('all-menus', async () => {
  const { data, error } = await client.from('menus').select('*').order('sort_order')
  if (error) throw error
  return data || []
})
const selectedRole = ref('')
const checked = ref<string[]>([])

watch(roles, (r) => {
  if (r?.length && !selectedRole.value) selectedRole.value = r[0].id
}, { immediate: true })

watch(selectedRole, async (roleId) => {
  if (!roleId) return
  const { data } = await client.from('role_menus').select('menu_id').eq('role_id', roleId)
  checked.value = (data || []).map((x: any) => x.menu_id)
})

async function saveMenus() {
  if (!selectedRole.value) return
  await client.from('role_menus').delete().eq('role_id', selectedRole.value)
  if (checked.value.length) {
    const rows = checked.value.map(menu_id => ({ role_id: selectedRole.value, menu_id }))
    const { error } = await client.from('role_menus').insert(rows)
    if (error) return alert(error.message)
  }
  alert('已保存菜单权限')
}
</script>

<template>
  <AdminShell>
    <div class="stack">
      <h1 style="margin:0;">角色管理</h1>
      <div class="card">
        <table class="table">
          <thead><tr><th>编码</th><th>名称</th><th>说明</th></tr></thead>
          <tbody>
            <tr v-for="r in roles" :key="r.id">
              <td>{{ r.code }}</td>
              <td>{{ r.name }}</td>
              <td class="muted">{{ r.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card stack">
        <h2 style="margin:0;">菜单权限分配</h2>
        <select v-model="selectedRole" class="select">
          <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
        <label v-for="m in menus" :key="m.id" class="row">
          <input v-model="checked" type="checkbox" :value="m.id">
          <span>{{ m.name }} <span class="muted">{{ m.path }}</span></span>
        </label>
        <button class="btn" @click="saveMenus">保存权限</button>
      </div>
    </div>
  </AdminShell>
</template>
