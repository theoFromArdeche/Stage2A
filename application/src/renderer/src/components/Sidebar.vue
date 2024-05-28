<script setup>
import ElementSidebar from './ElementSidebar.vue'
import { ref, onMounted } from 'vue'
const ipcRenderer = window.electron.ipcRenderer;

const batterie = ref("78%")
const position = ref("2413 3600")
const nbr_attente = ref("unknown")
const etat = ref("unknown")

ipcRenderer.on('updateBattery', (event, arg) => {
  batterie.value = arg.trim() + "%"
})

ipcRenderer.on('updatePosition', (event, arg) => {
  position.value = arg.trim()
})

ipcRenderer.on('updateStatus', (event, arg) => {
  etat.value = arg.trim()
})

ipcRenderer.on('updateWaitings', (event, arg) => {
  nbr_attente.value = arg.trim()
})
</script>

<template>
  <div>
    <div id="container_sidebar">
      <ElementSidebar
        class="elementSidebar"
        nom-robot="Robot 1"
        :etat="etat"
        :batterie="batterie"
        :file-attente="nbr_attente"
        :position="position"
      ></ElementSidebar>
      <ElementSidebar
        class="elementSidebar"
        nom-robot="Robot 2"
        etat="Disponible"
        batterie="100"
        file-attente="unknown"
        position="unknown"
      ></ElementSidebar>
      <ElementSidebar
        class="elementSidebar"
        nom-robot="Robot 3"
        etat="Disponible"
        batterie="100"
        file-attente="unknown"
        position="unknown"
      ></ElementSidebar>
    </div>
  </div>
</template>

<style scoped src="../styles/sidebar.css"></style>
