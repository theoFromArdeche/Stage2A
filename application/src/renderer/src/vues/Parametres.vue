<script setup>
import '../styles/parametres.css';
import { ref } from 'vue';

const ipcRenderer = window.electron.ipcRenderer;

const codeAdmin = ref('');

const inputAdmin = ref(null);
const buttonAdmin = ref(null);

const isAdmin = ref(false);

function handleSubmit(event) {
	if (isAdmin.value) {
		ipcRenderer.send('quitAdmin');
		return;
	}

	ipcRenderer.send('codeAdmin', codeAdmin.value);
	codeAdmin.value="";
	inputAdmin.value.disabled=true;
	inputAdmin.value.placeholder="En attente de traitement";
	buttonAdmin.value.disabled=true;
	buttonAdmin.value.className="";
	buttonAdmin.value.innerText="En attente";
}


ipcRenderer.on('adminRequestAccepted', () => {
	inputAdmin.value.placeholder="Vous êtes un Admin !";
	buttonAdmin.value.disabled=false;
	buttonAdmin.value.className="buttonAccessible";
	buttonAdmin.value.innerText="Quitter";
	isAdmin.value=true;
});


ipcRenderer.on('adminRequestRejected', () => {
	inputAdmin.value.disabled=false;
	inputAdmin.value.placeholder="Code Administrateur";
	buttonAdmin.value.disabled=false;
	buttonAdmin.value.className="buttonAccessible";
	buttonAdmin.value.innerText="Envoyer";
	isAdmin.value=false;
});

</script>

<template>
  <div>
		<div id="container_params">
			<div id="explications">
				<span>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut molestie, libero ac tincidunt varius, sapien augue gravida tortor, id vestibulum leo massa a libero. Nulla non risus iaculis, consequat arcu sed, finibus neque. Maecenas maximus eu est sed semper. Fusce nec cursus lectus. Donec eleifend dolor at magna hendrerit sodales. Suspendisse mattis ultricies consectetur. Mauris magna metus, placerat vitae est eget, placerat congue lectus. Cras eget sollicitudin libero, quis congue enim. Curabitur eget facilisis tellus. Nam orci sapien, faucibus sit amet porttitor et, eleifend at diam. Mauris molestie aliquam risus et ultrices. Nam cursus commodo aliquam.
					<br>
					Curabitur posuere leo quis orci interdum, nec maximus risus facilisis. Sed sed facilisis augue. Nullam scelerisque ullamcorper erat quis bibendum. Pellentesque consequat malesuada nisl, id semper ex facilisis vel. Donec ultricies quis nulla quis fermentum. Donec pellentesque porttitor lorem, at mattis enim mattis nec. Maecenas vulputate sapien sed metus tempor, in commodo dolor maximus. Praesent sed gravida massa.
					<br>
					<br>
				</span>
				<img src="@src/assets/omronRobot.png">
				<span>
					<br>
					<br>
					Suspendisse pharetra, dolor quis vehicula consequat, leo massa consequat nisl, vitae tincidunt nulla augue vitae velit. Sed ac euismod diam. Nunc vel ligula pharetra, suscipit justo eget, maximus libero. Nunc tellus ex, tristique vel mauris in, dapibus pharetra lacus. Quisque in risus sem. Cras sagittis ligula nunc, quis sollicitudin felis viverra in. Nullam vestibulum nibh a rutrum blandit. Nulla efficitur velit scelerisque tellus euismod tincidunt. Quisque vulputate tortor et sagittis rhoncus. Donec porta luctus tortor sit amet ornare. Integer id tincidunt massa. Nulla blandit odio ut dolor ornare hendrerit at nec justo.
					<br>
					<br>
				</span>
			</div>
			<form id="form_admin" @submit.prevent="handleSubmit">
				<input type="password" id="code_admin" placeholder="Code Administrateur" ref="inputAdmin" v-model="codeAdmin"/>
				<button ref="buttonAdmin" class="buttonAccessible">Envoyer</button>
			</form>
			<div id="credit">
				<span>
					<br>
					<br>
					Cette application a été réalisée par Théo Deygas en collaboration avec Pascale Marangé et Lemia Louail. <br>
					Ce projet fait suite au travail réalisé par Gabin Granjon, Nicolas Fernandez et Théo Deygas dans le cadre d'un projet de recherche organisé par Telecom Nancy.
				</span>
			</div>
		</div>
  </div>
</template>
