export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const client = useSupabaseClient()
  const { data } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.value.id)
    .maybeSingle()

  if (data?.role !== 'admin') {
    return navigateTo('/login?error=not_admin')
  }
})
