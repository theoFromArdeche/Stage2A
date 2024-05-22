<script setup>
import '../styles/simulation.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'
import Bottombar from '../components/Bottombar.vue'
import { ref, onMounted } from 'vue'

const ipcRenderer = window.electron.ipcRenderer

const statusMessages = ref([])

ipcRenderer.on('receiveResponse', (event, arg) => {
  const span_test = document.getElementById('test_requests')
  span_test.innerText = arg
})

function sendRequest(arg) {
  ipcRenderer.send('sendRequest', arg)
}

onMounted(() => {
  ipcRenderer.send('onSimulation');
})

</script>

<template>
  <div id="main_container">
    <span id="test_requests">test</span>
    <div id="container">
      <Sidebar id="sidebar"></Sidebar>
      <div id="container_map">
        <MapAIP></MapAIP>
      </div>
    </div>
    <div id="container_bottombar">
      <Bottombar
        id="bottombar"
        :statusMessages="statusMessages"
        @send-request="sendRequest"
      ></Bottombar>
    </div>
  </div>
</template>
