<script setup>
import '../styles/simulation.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'
import Bottombar from '../components/Bottonbar.vue'

const ipcRenderer = window.electron.ipcRenderer;

ipcRenderer.on('receiveResponse', (event, arg) => {
  const span_test = document.getElementById("test_requests");
  span_test.innerText = arg;
});


function sendRequest(arg) {
  ipcRenderer.send('sendRequest', arg);
}


</script>

<template>
  <div>
    <span id="test_requests">test</span>
    <div id="container">
      <Sidebar id="sidebar"></Sidebar>
      <div id="container_map">
        <MapAIP></MapAIP>
      </div>
      <Bottombar id="bottombar"></Bottombar>
      <div id="container_buttons">
        <button @click="sendRequest('salut\n')">Lancer la simulation</button>
      </div>
    </div>
  </div>
</template>
