<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()

const groups = [
  {
    label: '工作台',
    menus: [
      { label: '数据概览', path: '/' },
      { label: '统计分析', path: '/stats' },
    ],
  },
  {
    label: '内容运营',
    menus: [
      { label: '短剧管理', path: '/dramas' },
      { label: '标签管理', path: '/tags' },
      { label: '分类管理', path: '/categories' },
      { label: '首页编排', path: '/sections' },
    ],
  },
  {
    label: '用户与权限',
    menus: [
      { label: '客户管理', path: '/customers' },
      { label: '后台用户', path: '/system/users' },
      { label: '角色管理', path: '/system/roles' },
      { label: '菜单权限', path: '/system/menus' },
    ],
  },
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
      <div class="brand"><span class="brand-mark">R</span><span>ReelKit Admin</span></div>
      <nav>
        <div v-for="group in groups" :key="group.label" class="nav-group">
          <div class="nav-label">{{ group.label }}</div>
          <NuxtLink
            v-for="m in group.menus"
            :key="m.path"
            class="nav-link"
            :class="{ active: route.path === m.path || (m.path !== '/' && route.path.startsWith(m.path)) }"
            :to="m.path"
          >
            {{ m.label }}
          </NuxtLink>
        </div>
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
