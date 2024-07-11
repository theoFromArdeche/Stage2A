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
			<div v-if="etat" id = "state">État: {{ etat }}</div>
			<br v-else>
      <div v-if="batterie" id = "battery">Batterie: {{ batterie }}</div>
			<br v-else>
      <div v-if="fileAttente" id = "waiting_pos">En attente : {{ fileAttente }}</div>
			<br v-else>
      <div v-if="position" id = "position">Position : {{ position }}</div>
			<br v-else>
    </div>
  </div>
</template>

<style scoped src="../styles/elementSidebar.css"></style>
