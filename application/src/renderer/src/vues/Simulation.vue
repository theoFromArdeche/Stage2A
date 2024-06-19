<script setup>
import '../styles/simulation.css'
import '../styles/live_simulation_base.css'
import Sidebar from '../components/Sidebar.vue'
import MapAIP from '../components/MapAIP.vue'
import Bottombar from '../components/Bottombar.vue'

</script>

<template>
  <div>
    <div id="container">
      <Sidebar id="sidebar"></Sidebar>
      <div id="wrapper_map">
        <MapAIP :flagLive="false"></MapAIP>
      </div>
			<Bottombar :flagLive="false">
			</Bottombar>
    </div>
  </div>
</template>
