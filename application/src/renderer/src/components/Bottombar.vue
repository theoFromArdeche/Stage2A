<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

//const emit = defineEmits(['send-request'])

const statusMessage = ref([])
const container_statusMessages = ref(null)

const ipcRenderer = window.electron.ipcRenderer

ipcRenderer.on('updateStatus', (event, arg) => {
  const flagScroll = container_statusMessages.value.scrollHeight === container_statusMessages.value.offsetHeight + container_statusMessages.value.scrollTop;
  const oldScrollTop = container_statusMessages.value.scrollTop
  statusMessage.value.unshift(arg)
  updateScrollbar(flagScroll, oldScrollTop);
  //console.log(statusMessage)
})


async function updateScrollbar(flagScroll, oldScrollTop) {
  await nextTick();
  if (flagScroll) {
    container_statusMessages.value.scrollTop = container_statusMessages.value.scrollHeight;
  } else {
    container_statusMessages.value.scrollTop = oldScrollTop
  }
};

const containerHeight = ref('100px')
const maxHeight = window.innerHeight * 0.8
const minHeight = window.innerHeight * 0.15
let isResizing = false

const startResizing = (e) => {
  isResizing = true
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResizing)
}

const resize = (e) => {
  if (isResizing) {
    const newHeight = window.innerHeight - e.clientY
    if (newHeight > maxHeight) {
      containerHeight.value = `${maxHeight}px`
    } else if (newHeight < minHeight) {
      containerHeight.value = `${minHeight}px`
    } else {
      containerHeight.value = `${newHeight}px`
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
      <div ref="container_statusMessages" id="container_statusMessages">
        <div id="scrollbar">
          <div v-for="(message, index) in statusMessage" :key="index">{{ message }}<br /></div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped src="../styles/bottombar.css"></style>
