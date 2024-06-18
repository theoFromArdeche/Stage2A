<script setup>
import router from '../router/router.js'
import { onMounted } from 'vue';

var cur_button_id = 0

function change_view(view, new_button_id) {
	if (new_button_id==cur_button_id) return
  router.push(view)
  var container_elements = document.getElementById("container_topbar").children

	var cur_button = container_elements[cur_button_id].children[0]
	cur_button.style.padding="";
	cur_button.style.marginTop = ""

	var new_button = container_elements[new_button_id].children[0]
	new_button.style.padding = "0.8rem 4rem 0.8rem 4rem"
	new_button.style.marginTop = "3.2rem"

	cur_button_id=new_button_id
}

onMounted(() => {
	change_view('/simulation', 1)
})


</script>

<template>
  <div>
    <div id="container_topbar">
      <div>
        <button id="live" @click="change_view('/live', 0)">Live</button>
      </div>
      <div>
        <button id="simulation" @click="change_view('/simulation', 1)">Simulation</button>
      </div>
      <div>
        <button id="parametres" @click="change_view('/parametres', 2)">Parametres</button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../styles/topbar.css"></style>
