<script setup>
import '../styles/live.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'
import Fils1 from '../components/Fils1.vue'
import Fils2 from '../components/Fils2.vue'
import Bottombar from '../components/Bottombar.vue'
import { ref } from 'vue'

const test = ref('a')
function fonctionpere(input) {
  console.log('bonjour')
  test.value = input
}


const ipcRenderer = window.electron.ipcRenderer;


function requestHand() {
  ipcRenderer.send('requestHand');
}

ipcRenderer.on('receiveResponse', (event, arg) => {
  const span_test = document.getElementById("test_requests");
  console.log(arg.trim())
  span_test.innerText = arg.trim();
});


</script>

<template>
  <div>
    <span id="test_requests">test</span>
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
