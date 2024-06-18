<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick} from 'vue'

const emit = defineEmits(['requestHand'])
const props = defineProps({
  flagLive: {
    type: Boolean,
    required: true
  }
});



const statusMessage = ref([])
const container_statusMessages = ref(null)

const ipcRenderer = window.electron.ipcRenderer

ipcRenderer.on('updateStatus', (event, arg, flagLiveResponse) => {
	if (flagLiveResponse !== props.flagLive) return;
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
const coeffMaxHeight = 0.8
const minHeight = 100 // pixels
let isResizing = false

const startResizing = (e) => {
  isResizing = true
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResizing)
}

const resize = (e) => {
  if (isResizing) {
    const window_height = window.innerHeight
    const newHeight = window_height - e.clientY
    if (newHeight > window_height*coeffMaxHeight) {
      containerHeight.value = `${coeffMaxHeight*100}%`
    } else if (newHeight < minHeight) {
      containerHeight.value = `${minHeight}px`
    } else {
      containerHeight.value = `${newHeight/window_height*100}%`
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
  <div id="container_bottombar">
    <div v-if="props.flagLive" id="container_buttons">
      <button id="button_demander_main" @click="emit('requestHand')">Demander la main</button>
    </div>
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
