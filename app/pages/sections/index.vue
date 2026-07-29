<script setup lang="ts">
import type { Drama, HomeSection } from '~/types/database.types'

definePageMeta({ middleware: 'auth' })

const client = useSupabaseClient()

const { data: sections, refresh } = await useAsyncData('sections', async () => {
  const { data, error } = await client.from('home_sections').select('*').order('sort_order')
  if (error) throw error
  return data as HomeSection[]
})

const { data: dramas } = await useAsyncData('all-dramas', async () => {
  const { data, error } = await client.from('dramas').select('id,title,status').order('title')
  if (error) throw error
  return data as Pick<Drama, 'id' | 'title' | 'status'>[]
})

const form = reactive({ title: '', slug: '', sort_order: 0 })
const itemForm = reactive({ section_id: '', drama_id: '', sort_order: 0 })

async function addSection() {
  const { error } = await client.from('home_sections').insert({
    title: form.title.trim(),
    slug: form.slug.trim(),
    sort_order: form.sort_order,
    is_active: true,
  })
  if (error) {
    alert(error.message)
    return
  }
  form.title = ''
  form.slug = ''
  await refresh()
}

async function addItem() {
  const { error } = await client.from('home_section_items').insert({
    section_id: itemForm.section_id,
    drama_id: itemForm.drama_id,
    sort_order: itemForm.sort_order,
  })
  if (error) {
    alert(error.message)
    return
  }
  alert('Item added to section')
}
</script>

<template>
  <div>
    <nav class="nav">
      <strong>ReelKit Admin</strong>
      <NuxtLink to="/">Dashboard</NuxtLink>
      <NuxtLink to="/dramas">Dramas</NuxtLink>
      <NuxtLink to="/categories">Categories</NuxtLink>
      <NuxtLink to="/sections" class="active">Home sections</NuxtLink>
    </nav>
    <div class="container stack">
      <h1>Home sections</h1>
      <div class="card">
        <table class="table">
          <thead><tr><th>Title</th><th>Slug</th><th>Order</th><th>Active</th></tr></thead>
          <tbody>
            <tr v-for="s in sections" :key="s.id">
              <td>{{ s.title }}</td>
              <td>{{ s.slug }}</td>
              <td>{{ s.sort_order }}</td>
              <td>{{ s.is_active ? 'Yes' : 'No' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card stack">
        <h2>Add section</h2>
        <input v-model="form.title" class="input" placeholder="Title">
        <input v-model="form.slug" class="input" placeholder="slug">
        <input v-model.number="form.sort_order" class="input" type="number">
        <button class="btn" @click="addSection">Add section</button>
      </div>

      <div class="card stack">
        <h2>Add drama to section</h2>
        <select v-model="itemForm.section_id" class="select">
          <option disabled value="">Select section</option>
          <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.title }}</option>
        </select>
        <select v-model="itemForm.drama_id" class="select">
          <option disabled value="">Select drama</option>
          <option v-for="d in dramas" :key="d.id" :value="d.id">{{ d.title }} ({{ d.status }})</option>
        </select>
        <input v-model.number="itemForm.sort_order" class="input" type="number" placeholder="sort order">
        <button class="btn" :disabled="!itemForm.section_id || !itemForm.drama_id" @click="addItem">Add item</button>
      </div>
    </div>
  </div>
</template>
