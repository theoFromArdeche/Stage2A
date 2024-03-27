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
      <div>{{ nomRobot }}</div>
      <div>État: {{ etat }}</div>
      <div>Batterie: {{ batterie }}%</div>
      <div>{{ fileAttente }} en attente</div>
    </div>
  </div>
</template>

<style scoped src="../styles/elementSidebar.css"></style>
