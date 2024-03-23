<script setup>
defineProps({ TestProp: String })
</script>

<template>
  <div>
    <div id="container_elementSidebar">
      <span>{{ TestProp }}</span>
    </div>
  </div>
</template>

<style scoped src="../styles/elementSidebar.css"></style>
