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
        <div v-for="(message, index) in statusMessage" :key="index">{{ message }}<br /></div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../styles/bottombar.css"></style>
