<script setup>
import '../styles/live.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
</script>

<template>
  <div>
    <span id="temp">live</span>
    <div id="container">
      <Sidebar id="sidebar"></Sidebar>
      <div id="container_map">
        <img id="map" src="../assets/carte.png" draggable="false" />
      </div>
      <div id="container_buttons">
        <button>test1</button>
        <button>test2</button>
      </div>
    </div>
  </div>
</template>
