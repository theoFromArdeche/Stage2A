<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['send-request'])

const statusMessage = ref([])

const ipcRenderer = window.electron.ipcRenderer

ipcRenderer.on('updateStatus', (event, arg) => {
  statusMessage.value.push(arg)
  console.log(statusMessage)
})

const containerHeight = ref('100px')
const maxHeight = 280
let isResizing = false

const startResizing = (e) => {
  isResizing = true
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResizing)
}

const resize = (e) => {
  if (isResizing) {
    const newHeight = window.innerHeight - e.clientY
    if (newHeight < maxHeight) {
      containerHeight.value = `${newHeight}px`
    } else {
      containerHeight.value = `${maxHeight}px`
    }
  }
}

const stopResizing = () => {
  isResizing = false
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResizing)
}

onMounted(() => {
  document.addEventListener('mouseup', stopResizing)
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseup', stopResizing)
})
</script>

<template>
  <div>
    <div id="resize_handle" @mousedown="startResizing"></div>
    <div :style="{ height: containerHeight }" id="container_bar">
      <div id="container_statusMessages">
        <div v-for="(message, index) in statusMessage" :key="index">{{ message }}<br /></div>
      </div>
    </div>
  </div>
</template>
<style scoped src="../styles/bottombar.css"></style>
