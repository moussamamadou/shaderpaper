<script setup lang="ts">
// "Poster name · ShaderPaper"; pages without a title get the brand alone.
useHead({ titleTemplate: (title?: string) => (title ? `${title} · ShaderPaper` : 'ShaderPaper') })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
