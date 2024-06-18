<script setup>
import './styles/app.css'
import Topbar from './components/Topbar.vue'
</script>

<template>
	<div id="background">
	</div>
  <router-view id="router_view" v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <Topbar id="topbar"></Topbar>
</template>
