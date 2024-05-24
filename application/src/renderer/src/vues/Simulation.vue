<script setup>
import '../styles/simulation.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'
import Bottombar from '../components/Bottombar.vue'
import { ref, onMounted } from 'vue'


const statusMessages = ref([])


</script>

<template>
  <div id="main_container">
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
