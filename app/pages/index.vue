<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const client = useSupabaseClient()
const { count: dramaCount } = await client.from('dramas').select('*', { count: 'exact', head: true })
const { count: episodeCount } = await client.from('episodes').select('*', { count: 'exact', head: true })
</script>

<template>
  <div>
    <nav class="nav">
      <strong>ReelKit Admin</strong>
      <NuxtLink to="/" class="active">Dashboard</NuxtLink>
      <NuxtLink to="/dramas">Dramas</NuxtLink>
      <NuxtLink to="/categories">Categories</NuxtLink>
      <NuxtLink to="/sections">Home sections</NuxtLink>
    </nav>
    <div class="container stack">
      <h1>Dashboard</h1>
      <div class="row">
        <div class="card" style="min-width: 180px;">
          <div class="muted">Dramas</div>
          <div style="font-size: 28px; font-weight: 700;">{{ dramaCount ?? 0 }}</div>
        </div>
        <div class="card" style="min-width: 180px;">
          <div class="muted">Episodes</div>
          <div style="font-size: 28px; font-weight: 700;">{{ episodeCount ?? 0 }}</div>
        </div>
      </div>
      <NuxtLink class="btn" to="/dramas/new">Add drama</NuxtLink>
    </div>
  </div>
</template>
