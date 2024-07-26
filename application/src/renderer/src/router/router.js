import { createRouter, createWebHistory } from 'vue-router'
import Simulation from '../vues/Simulation.vue'
import Parametres from '../vues/Parametres.vue'

const ipcRenderer = window.electron.ipcRenderer



const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Simulation }, // Route de base vers la simulation
    { path: '/simulation', component: Simulation }, // Route pour la simulation
    { path: '/parametres', component: Parametres } // Route pour les paramètres
  ]
})

const flags = {'/': 'onSimulation', '/simulation': 'onSimulation', '/parametres': 'onParametres'}

router.beforeEach((to, from, next) => {
  ipcRenderer.send(flags[to.fullPath])
  next()
})


export default router
