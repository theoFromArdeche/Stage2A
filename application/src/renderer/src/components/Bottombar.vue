<script setup>
import { ref } from 'vue';

const emit = defineEmits(['send-request'])

var statusMessage = ref([])

const ipcRenderer = window.electron.ipcRenderer;

ipcRenderer.on('updateStatus', (event, arg) => {
  statusMessage.value.push(arg)
  console.log(statusMessage)
})
</script>

<template>
  <div>
    <div id="container_bar">
      <div id="container_statusMessages">
        <div v-for="(message, index) in statusMessage" :key="index">{{ message }}<br /></div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../styles/bottombar.css"></style>
