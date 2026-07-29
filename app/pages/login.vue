<script setup lang="ts">
const client = useSupabaseClient()
const route = useRoute()
const username = ref('admin')
const password = ref('admin123')
const loading = ref(false)
const message = ref('')
const error = computed(() => String(route.query.error || ''))

async function login() {
  loading.value = true
  message.value = ''
  const loginId = username.value.trim()
  const { data: email, error: resolveErr } = await client.rpc('resolve_auth_email', { p_login: loginId })
  if (resolveErr || !email) {
    loading.value = false
    message.value = resolveErr?.message || '账号不存在'
    return
  }
  const { error: authErr } = await client.auth.signInWithPassword({
    email: String(email),
    password: password.value,
  })
  loading.value = false
  if (authErr) {
    message.value = authErr.message
    return
  }
  const user = useSupabaseUser()
  const { data: profile } = await client.from('profiles').select('role,status').eq('id', user.value!.id).maybeSingle()
  if (profile?.role !== 'admin' || profile.status === 'disabled') {
    await client.auth.signOut()
    message.value = '该账号无管理端权限'
    return
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await navigateTo(redirect)
}
</script>

<template>
  <div style="min-height:100vh; display:grid; place-items:center; padding:24px;">
    <div class="card stack" style="width:min(420px,100%);">
      <h1 style="margin:0;">管理端登录</h1>
      <p class="muted">账号密码登录（默认 admin / admin123）</p>
      <p v-if="error === 'forbidden'" class="error">无权限访问管理端</p>
      <label>账号<input v-model="username" class="input" autocomplete="username" @keyup.enter="login"></label>
      <label>密码<input v-model="password" class="input" type="password" autocomplete="current-password" @keyup.enter="login"></label>
      <button class="btn" :disabled="loading || !username || !password" @click="login">登录</button>
      <p v-if="message" class="error">{{ message }}</p>
    </div>
  </div>
</template>
