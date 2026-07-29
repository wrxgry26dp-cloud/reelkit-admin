<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const client = useSupabaseClient()
const form = reactive({
  title: '',
  slug: '',
  synopsis: '',
  is_trending: false,
})
const message = ref('')
const saving = ref(false)
const coverFile = ref<File | null>(null)
const coverPreview = ref('')

watch(() => form.title, (t) => {
  if (!form.slug) form.slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
})

function selectCover(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    message.value = '封面仅支持 JPG、PNG、WebP'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    message.value = '封面不能超过 10MB'
    return
  }
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

async function save() {
  if (!coverFile.value) {
    message.value = '请选择本地封面文件'
    return
  }
  saving.value = true
  message.value = ''
  const { data, error } = await client.from('dramas').insert({
    title: form.title.trim(),
    slug: form.slug.trim(),
    synopsis: form.synopsis.trim(),
    status: 'draft',
    is_trending: form.is_trending,
  }).select('id').single()
  if (error) {
    saving.value = false
    message.value = error.message
    return
  }

  const ext = coverFile.value.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${data.id}/cover-${Date.now()}.${ext}`
  const { error: uploadError } = await client.storage
    .from('posters')
    .upload(path, coverFile.value, { contentType: coverFile.value.type, upsert: true })

  if (uploadError) {
    await client.from('dramas').delete().eq('id', data.id)
    saving.value = false
    message.value = `封面上传失败：${uploadError.message}`
    return
  }

  const coverUrl = client.storage.from('posters').getPublicUrl(path).data.publicUrl
  const { error: updateError } = await client
    .from('dramas')
    .update({ cover_url: coverUrl, cover_path: path })
    .eq('id', data.id)

  if (updateError) {
    saving.value = false
    message.value = updateError.message
    return
  }
  await navigateTo(`/dramas/${data.id}`)
}
</script>

<template>
  <AdminShell>
    <div style="max-width:920px;">
      <div class="breadcrumbs">内容运营 / 短剧管理 / 新建短剧</div>
      <div class="page-head">
        <div><h1>新建短剧</h1><div class="muted">先创建基础资料与封面，再进入分集媒资管理。</div></div>
        <NuxtLink class="btn ghost" to="/dramas">返回列表</NuxtLink>
      </div>
      <div class="stepper">
        <span class="step active">1. 基础资料与封面</span>
        <span class="step">2. 分集与多语视频</span>
        <span class="step">3. 检查并发布</span>
      </div>
      <div class="card">
        <div class="form-grid">
          <label class="field">
            <span class="field-label required">短剧标题</span>
            <input v-model="form.title" class="input" placeholder="请输入展示标题">
          </label>
          <label class="field">
            <span class="field-label required">Slug</span>
            <input v-model="form.slug" class="input" placeholder="用于 URL，只能用英文、数字与连字符">
          </label>
          <label class="field form-span">
            <span class="field-label required">剧情简介</span>
            <textarea v-model="form.synopsis" class="textarea" placeholder="用于用户端详情与播放页" />
          </label>
          <div class="field">
            <span class="field-label required">竖版封面</span>
            <label class="upload-zone">
              <img v-if="coverPreview" :src="coverPreview" class="upload-preview" alt="封面预览">
              <span v-else>点击选择本地封面</span>
              <span class="muted">JPG / PNG / WebP，建议 2:3，最大 10MB</span>
              <input hidden type="file" accept="image/jpeg,image/png,image/webp" @change="selectCover">
            </label>
          </div>
          <div class="field">
            <span class="field-label">运营属性</span>
            <label class="row card" style="background:#10141c;">
              <input v-model="form.is_trending" type="checkbox">
              <span>标记为热门短剧</span>
            </label>
            <div class="muted">新建后默认保存为草稿，不会立即展示给用户。</div>
          </div>
        </div>
        <div class="row" style="justify-content:flex-end; margin-top:20px;">
          <NuxtLink class="btn ghost" to="/dramas">取消</NuxtLink>
          <button class="btn" :disabled="saving || !form.title || !form.slug || !form.synopsis || !coverFile" @click="save">
            {{ saving ? '正在创建并上传封面…' : '保存草稿，继续配置分集' }}
          </button>
        </div>
        <p v-if="message" class="error">{{ message }}</p>
      </div>
    </div>
  </AdminShell>
</template>
