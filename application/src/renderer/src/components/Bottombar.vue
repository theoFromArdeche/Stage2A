<script setup>
const emit = defineEmits(['send-request'])


defineProps({
  statusMessage: String
})
</script>

<template>
  <div>
    <div id="container_bottombar">
      <div id="container_statusMessages">
        <div>{{ statusMessage }}Docked</div>
      </div>
      <div id="container_buttons_simulation">
        <button @click="emit('send-request', 'salut\n')">Lancer la simulation</button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../styles/bottombar.css"></style>
