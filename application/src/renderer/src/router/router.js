import { createRouter, createWebHistory } from 'vue-router'
import Live from '../vues/Live.vue'
import Simulation from '../vues/Simulation.vue'
import Parametres from '../vues/Parametres.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Simulation }, // Route de base vers le live
    { path: '/live', component: Live }, // Route pour le live
    { path: '/simulation', component: Simulation }, // Route pour la simulation
    { path: '/parametres', component: Parametres } // Route pour les paramêtres
  ]
})

export default router
