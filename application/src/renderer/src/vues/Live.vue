<script setup>
import '../styles/live.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'
import Bottombar from '../components/Bottombar.vue'

</script>

<template>
  <div>
    <div id="containerMainBody">
      <Sidebar id="sidebar"></Sidebar>
      <div id="wrapper_map">
        <MapAIP :flagLive="true"></MapAIP>
      </div>
      <Bottombar :flagLive="true">
      </Bottombar>
    </div>
  </div>
</template>

