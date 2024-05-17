<script setup>
import '../styles/live.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'


const ipcRenderer = window.electron.ipcRenderer;


function requestHand() {
  ipcRenderer.send('requestHand');
}


</script>

<template>
  <div>
    <div id="container">
      <Sidebar id="sidebar"></Sidebar>
      <div id="container_map">
        <MapAIP></MapAIP>
      </div>
      <div id="container_buttons">
        <button>Lancer le programme</button>
        <button @click="requestHand()">Demander la main</button>
      </div>
    </div>
  </div>
</template>
