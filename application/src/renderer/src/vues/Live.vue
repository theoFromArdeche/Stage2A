<script setup>
import '../styles/live.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'
import Fils1 from '../components/Fils1.vue'
import Fils2 from '../components/Fils2.vue'
import Bottombar from '../components/Bottombar.vue'
import { ref, onMounted } from 'vue'


const ipcRenderer = window.electron.ipcRenderer;


function requestHand() {
  ipcRenderer.send('requestHand');
}



onMounted(() => {
  ipcRenderer.send('onLive');
})


</script>

<template>
  <div id="main_container">
    <div id="container">
      <Sidebar id="sidebar"></Sidebar>
      <div id="container_map">
        <MapAIP></MapAIP>
        <Fils1 @fonctionpere="fonctionpere"></Fils1>
        <Fils2 :receivedValue="test"></Fils2>
      </div>
      <div id="container_buttons">
        <button @click="requestHand()">Demander la main</button>
      </div>
      <div id="container_bottombar">
        <Bottombar
          id="bottombar"
          :statusMessages="statusMessages"
          @send-request="sendRequest"
        ></Bottombar>
      </div>
    </div>
  </div>
</template>
