<script setup lang="ts">
import type { Category } from '~/types/database.types'

definePageMeta({ middleware: 'auth' })

const client = useSupabaseClient()
const { data, refresh } = await useAsyncData('categories', async () => {
  const { data, error } = await client.from('categories').select('*').order('sort_order')
  if (error) throw error
  return data as Category[]
})

const form = reactive({ name: '', slug: '', sort_order: 0 })

async function addCategory() {
  const { error } = await client.from('categories').insert({
    name: form.name.trim(),
    slug: form.slug.trim(),
    sort_order: form.sort_order,
  })
  if (error) {
    alert(error.message)
    return
  }
  form.name = ''
  form.slug = ''
  await refresh()
}
</script>

<template>
  <div>
    <nav class="nav">
      <strong>ReelKit Admin</strong>
      <NuxtLink to="/">Dashboard</NuxtLink>
      <NuxtLink to="/dramas">Dramas</NuxtLink>
      <NuxtLink to="/categories" class="active">Categories</NuxtLink>
      <NuxtLink to="/sections">Home sections</NuxtLink>
    </nav>
    <div class="container stack">
      <h1>Categories</h1>
      <div class="card">
        <table class="table">
          <thead><tr><th>Name</th><th>Slug</th><th>Order</th></tr></thead>
          <tbody>
            <tr v-for="c in data" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ c.slug }}</td>
              <td>{{ c.sort_order }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card stack">
        <h2>Add category</h2>
        <input v-model="form.name" class="input" placeholder="Name">
        <input v-model="form.slug" class="input" placeholder="slug">
        <input v-model.number="form.sort_order" class="input" type="number" placeholder="sort order">
        <button class="btn" @click="addCategory">Add</button>
      </div>
    </div>
  </div>
</template>
