<script setup>
import ElementSidebar from './ElementSidebar.vue'
import { ref, onMounted, computed } from 'vue'
const ipcRenderer = window.electron.ipcRenderer;

const robotsMap = ref(new Map());
const flagNoRobot = ref(true);
const selectedRobotId = ref('');

ipcRenderer.on('updateBattery', (event, robotId, battery) => {
  const robot = robotsMap.value.get(robotId);
  if (!robot) return;
  robot.batterie = battery.trim() + "%";
  robotsMap.value.set(robotId, { ...robot });
});


ipcRenderer.on('updatePosition', (event, robotId, position) => {
  const robot = robotsMap.value.get(robotId);
  if (!robot) return;
  const pos_arr = position.split(' ');
  robot.position = `${parseInt(pos_arr[0])} ${parseInt(pos_arr[1])} ${parseInt(pos_arr[2])}`;
  robotsMap.value.set(robotId, { ...robot });
});


ipcRenderer.on('Sidebar-updateStatus', (event, robotId, status) => {
  const robot = robotsMap.value.get(robotId);
  if (!robot) return;
  robot.etat = status.trim();
  robotsMap.value.set(robotId, { ...robot });
});


ipcRenderer.on('updateWaitings', (event, robotId, waiting) => {
  const robot = robotsMap.value.get(robotId);
  if (!robot) return;
  robot.fileAttente = waiting.trim();
  robotsMap.value.set(robotId, { ...robot });
});


ipcRenderer.on('addRobot', (event, robotId) => {
  if (!robotsMap.value.has(robotId)) {
		if (!robotsMap.value.size) {
			flagNoRobot.value = false;
		}
    robotsMap.value.set(robotId,
			{ etat: 'unknown', batterie: 'unknown', fileAttente: 'unknown', position: 'unknown' }
		);
  }
});


ipcRenderer.on('removeRobot', (event, robotId) => {
  robotsMap.value.delete(robotId);
	if (!robotsMap.value.size) flagNoRobot.value=true;
});


ipcRenderer.on('changeSelected', (event, robotId) => {
	selectedRobotId.value = robotId;
})


function elementClicked(robotId) {
	ipcRenderer.send('changeRobot', robotId);
}


const robotsArray = computed(() => Array.from(robotsMap.value));

onMounted(() => {
  ipcRenderer.send('Sidebar-vue-loaded');
});

</script>

<template>
  <div>
    <div id="container_sidebar">
			<ElementSidebar
				v-if="flagNoRobot"
        class="elementSidebar"
        nom-robot="Aucun robot disponible"
        etat=""
        batterie=""
        file-attente=""
        position=""
      ></ElementSidebar>
      <ElementSidebar
        v-for="([robotId, robot], index) in robotsArray"
				@click="elementClicked(robotId)"
        :key="robotId"
        :class="robotId !== selectedRobotId?'elementSidebar':'sidebarSelectedElement'"
        :nom-robot="robotId"
        :etat="robot.etat"
        :batterie="robot.batterie"
        :file-attente="robot.fileAttente"
        :position="robot.position"
      ></ElementSidebar>
    </div>
  </div>
</template>

<style scoped src="../styles/sidebar.css"></style>
