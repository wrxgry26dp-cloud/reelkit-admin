<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()

const menus = [
  { label: '仪表盘', path: '/' },
  { label: '用户管理', path: '/system/users' },
  { label: '角色管理', path: '/system/roles' },
  { label: '菜单权限', path: '/system/menus' },
  { label: '剧集列表', path: '/dramas' },
  { label: '标签管理', path: '/tags' },
  { label: '客户管理', path: '/customers' },
  { label: '统计模块', path: '/stats' },
]

const route = useRoute()
async function logout() {
  await client.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">ReelKit Admin</div>
      <nav>
        <NuxtLink
          v-for="m in menus"
          :key="m.path"
          class="nav-link"
          :class="{ active: route.path === m.path || (m.path !== '/' && route.path.startsWith(m.path)) }"
          :to="m.path"
        >
          {{ m.label }}
        </NuxtLink>
      </nav>
      <div style="margin-top:24px; padding:12px;" class="muted">
        <div>{{ user?.email }}</div>
        <button class="btn secondary" style="margin-top:8px; width:100%;" @click="logout">退出</button>
      </div>
    </aside>
    <main class="main">
      <slot />
    </main>
  </div>
</template>
