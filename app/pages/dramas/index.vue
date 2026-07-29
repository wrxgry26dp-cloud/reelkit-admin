<script setup lang="ts">
import type { Drama } from '~/types/database.types'

definePageMeta({ middleware: 'auth' })

const client = useSupabaseClient()
const { data, refresh } = await useAsyncData('admin-dramas', async () => {
  const { data, error } = await client.from('dramas').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data as Drama[]
})

async function removeDrama(id: string) {
  if (!confirm('Delete this drama and its episodes?')) return
  const { error } = await client.from('dramas').delete().eq('id', id)
  if (error) {
    alert(error.message)
    return
  }
  await refresh()
}
</script>

<template>
  <div>
    <nav class="nav">
      <strong>ReelKit Admin</strong>
      <NuxtLink to="/">Dashboard</NuxtLink>
      <NuxtLink to="/dramas" class="active">Dramas</NuxtLink>
      <NuxtLink to="/categories">Categories</NuxtLink>
      <NuxtLink to="/sections">Home sections</NuxtLink>
    </nav>
    <div class="container stack">
      <div class="row" style="justify-content: space-between;">
        <h1>Dramas</h1>
        <NuxtLink class="btn" to="/dramas/new">Add drama</NuxtLink>
      </div>
      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Trending</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in data" :key="d.id">
              <td>
                <div>{{ d.title }}</div>
                <div class="muted">{{ d.slug }}</div>
              </td>
              <td><span class="badge" :class="d.status">{{ d.status }}</span></td>
              <td>{{ d.is_trending ? 'Yes' : 'No' }}</td>
              <td class="row">
                <NuxtLink class="btn secondary" :to="`/dramas/${d.id}`">Edit</NuxtLink>
                <button class="btn secondary" @click="removeDrama(d.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
