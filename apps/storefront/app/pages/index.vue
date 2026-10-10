<script setup lang="ts">
/**
 * "/" never renders: the global region middleware redirects (307) to
 * /{countryCode} first. The page exists so the route matches.
 */
</script>

<template>
  <div />
</template>
