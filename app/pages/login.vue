<script setup lang="ts">
const supabase = useSupabaseClient()
const route = useRoute()
const email = ref('')
const otp = ref('')
const step = ref<'email' | 'otp'>('email')
const loading = ref(false)
const message = ref('')
const error = computed(() => String(route.query.error || ''))

async function sendOtp() {
  loading.value = true
  message.value = ''
  const { error: err } = await supabase.auth.signInWithOtp({ email: email.value.trim() })
  loading.value = false
  if (err) {
    message.value = err.message
    return
  }
  step.value = 'otp'
  message.value = 'Check your email for the one-time code.'
}

async function verifyOtp() {
  loading.value = true
  message.value = ''
  const { error: err } = await supabase.auth.verifyOtp({
    email: email.value.trim(),
    token: otp.value.trim(),
    type: 'email',
  })
  loading.value = false
  if (err) {
    message.value = err.message
    return
  }

  const user = useSupabaseUser()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.value!.id)
    .maybeSingle()

  if (data?.role !== 'admin') {
    await supabase.auth.signOut()
    message.value = 'This account is not an admin. Set role=admin in profiles first.'
    return
  }

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await navigateTo(redirect)
}
</script>

<template>
  <div class="container" style="max-width: 420px; padding-top: 80px;">
    <div class="card stack">
      <h1>ReelKit Admin</h1>
      <p class="muted">Sign in with email OTP. Admin role required.</p>
      <p v-if="error === 'not_admin'" class="error">Not an admin account.</p>
      <template v-if="step === 'email'">
        <input v-model="email" class="input" type="email" placeholder="Admin email" @keyup.enter="sendOtp">
        <button class="btn" :disabled="loading || !email" @click="sendOtp">Send code</button>
      </template>
      <template v-else>
        <input v-model="otp" class="input" type="text" placeholder="OTP code" @keyup.enter="verifyOtp">
        <button class="btn" :disabled="loading || !otp" @click="verifyOtp">Verify</button>
        <button class="btn secondary" @click="step = 'email'">Back</button>
      </template>
      <p v-if="message" class="muted">{{ message }}</p>
    </div>
  </div>
</template>
