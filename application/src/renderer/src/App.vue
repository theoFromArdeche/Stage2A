<script setup>
import './styles/app.css'
import Topbar from './components/Topbar.vue'
</script>

<template>
  <Topbar id="topbar"></Topbar>
  <router-view id="router_view" />
</template>
