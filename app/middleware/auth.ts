export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  const client = useSupabaseClient()
  const { data } = await client.from('profiles').select('role,username,status').eq('id', user.value.id).maybeSingle()
  if (!data || data.role !== 'admin' || data.status === 'disabled') {
    await client.auth.signOut()
    return navigateTo('/login?error=forbidden')
  }
})
