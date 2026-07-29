export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const client = useSupabaseClient()
  const { data: ok } = await client.rpc('ensure_admin_access')
  if (!ok) {
    await client.auth.signOut()
    return navigateTo('/login?error=forbidden')
  }
})
