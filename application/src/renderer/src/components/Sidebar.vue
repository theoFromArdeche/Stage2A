<script setup>
import ElementSidebar from './ElementSidebar.vue'
</script>

<template>
  <div>
    <div id="container_sidebar">
      <ElementSidebar class="elementSidebar" TestProp="test1" ></ElementSidebar>
      <ElementSidebar class="elementSidebar" TestProp="test2"></ElementSidebar>
      <ElementSidebar class="elementSidebar" TestProp="test3"></ElementSidebar>
    </div>
  </div>
</template>

<style scoped src="../styles/sidebar.css"></style>
