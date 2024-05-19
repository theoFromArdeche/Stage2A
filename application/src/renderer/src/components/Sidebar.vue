<script setup>
import ElementSidebar from './ElementSidebar.vue'
</script>

<template>
  <div>
    <div id="container_sidebar">
      <ElementSidebar
        class="elementSidebar"
        nom-robot="Robot 1"
        etat="Disponible"
        batterie="100"
        file-attente="0"
      ></ElementSidebar>
      <ElementSidebar
        class="elementSidebar"
        nom-robot="Robot 2"
        etat="Disponible"
        batterie="100"
        file-attente="0"
      ></ElementSidebar>
      <ElementSidebar
        class="elementSidebar"
        nom-robot="Robot 3"
        etat="Disponible"
        batterie="100"
        file-attente="0"
      ></ElementSidebar>
    </div>
  </div>
</template>

<style scoped src="../styles/sidebar.css"></style>
