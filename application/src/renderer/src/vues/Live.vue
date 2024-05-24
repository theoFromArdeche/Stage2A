<script setup>
import '../styles/live.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'
import Bottombar from '../components/Bottombar.vue'
import { ref, onMounted } from 'vue'

const ipcRenderer = window.electron.ipcRenderer;


function requestHand() {
  ipcRenderer.send('requestHand');
}



onMounted(() => {
  ipcRenderer.send('onLive');
})

ipcRenderer.on('receiveQueue', (event, arg) => {
  const button = document.getElementById("button_demander_main");
  button.innerText = arg.trim();
});

</script>

<template>
  <div>
    <div id="container">
      <Sidebar id="sidebar"></Sidebar>
      <div id="container_map">
        <MapAIP></MapAIP>
      </div>
      <div id="container_buttons">
        <button id="button_demander_main" @click="requestHand()">Demander la main</button>
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
