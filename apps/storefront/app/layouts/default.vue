<script setup lang="ts">
/**
 * Site chrome: header (with cart count), main, footer, the cart drawer and
 * the toast region. The cart is fetched once here during SSR so the count is
 * right on first paint (MapAndSky's Nav did the same through useCartData).
 */
useCanonical()
const { useCartData } = useCart()
await useCartData()
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <LayoutHeader />
    <main id="main" tabindex="-1" class="flex-1 focus-visible:shadow-none">
      <slot />
    </main>
    <LayoutFooter />
    <LayoutCartDrawer />
    <LayoutToasts />
  </div>
</template>
