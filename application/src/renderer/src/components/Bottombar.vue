<script setup>
const emit = defineEmits(['send-request'])

defineProps({
  statusMessage: Array
})
</script>

<template>
  <div>
    <div id="container_bar">
      <div id="container_statusMessages">
        <div v-for="(message, index) in statusMessage" :key="index">{{ message }}</div>
      </div>
      <div id="container_buttons_simulation">
        <button @click="emit('send-request', 'salut\n')">Lancer la simulation</button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../styles/bottombar.css"></style>
