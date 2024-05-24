import { createRouter, createWebHistory } from 'vue-router'
import Live from '../vues/Live.vue'
import Simulation from '../vues/Simulation.vue'
import Parametres from '../vues/Parametres.vue'

const ipcRenderer = window.electron.ipcRenderer



const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Simulation }, // Route de base vers la simulation
    { path: '/live', component: Live }, // Route pour le live
    { path: '/simulation', component: Simulation }, // Route pour la simulation
    { path: '/parametres', component: Parametres } // Route pour les paramètres
  ]
})

const flags = {'/': 'onSimulation', '/live': 'onLive', '/simulation': 'onSimulation', '/parametres': 'onParametres'}

router.beforeEach((to, from, next) => {
  ipcRenderer.send(flags[to.fullPath])
  next()
})


export default router
