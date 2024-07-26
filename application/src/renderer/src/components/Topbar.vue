<script setup>
import router from '../router/router.js'
import { onMounted, ref } from 'vue';

const cur_button_id = ref(1);

function change_view(view, new_button_id) {
	if (new_button_id==cur_button_id.value) return;
  router.push(view)
  var container_elements = document.getElementById("container_topbar").children;

	var cur_button = container_elements[cur_button_id.value].children[0]
	cur_button.className="";

	var new_button = container_elements[new_button_id].children[0]
	new_button.className="buttonTopbarSelected";

	cur_button_id.value=new_button_id;
}

onMounted(() => {
	change_view('/simulation', 0);
})


</script>

<template>
  <div>
    <div id="container_topbar">
      <div class="wrapperButtonTopbar">
        <button id="simulation" @click="change_view('/simulation', 0)">Simulation</button>
      </div>
      <div class="wrapperButtonTopbar">
        <button id="parametres" @click="change_view('/parametres', 1)">Parametres</button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../styles/topbar.css"></style>
