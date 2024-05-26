<script setup>
defineProps({
  nomRobot: String,
  etat: String,
  batterie: String,
  fileAttente: String,
  position: String
})

</script>

<template>
  <div>
    <div id="container_elementSidebar">
      <div>{{ nomRobot }}</div>
      <div id = "state">État: {{ etat }}</div>
      <div id = "battery">Batterie: {{ batterie }}</div>
      <div id = "waiting_pos">En attente : {{ fileAttente }}</div>
      <div id = "position">Position : {{ position }}</div>
    </div>
  </div>
</template>

<style scoped src="../styles/elementSidebar.css"></style>
