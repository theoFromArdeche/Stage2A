<script setup>
defineProps({
  nomRobot: String,
  etat: String,
  batterie: Number,
  fileAttente: Number
})
</script>

<template>
  <div>
    <div id="container_elementSidebar">
      <span>{{ nomRobot }}</span> - <span>{{ etat }}</span> - <span>{{ batterie }}%</span> - <span>{{ fileAttente }}</span>
    </div>
  </div>
</template>

<style scoped src="../styles/elementSidebar.css"></style>
