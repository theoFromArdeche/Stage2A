<script setup>
import '../styles/parametres.css'
</script>

<template>
  <div>
    <div id="container_params">
      <div id="box_stats" class="box">
        <span id="titre_stats" class="elt_stats"> Statistiques avancées</span>
        <label class="elt_stats " id="switch">
          <input type="checkbox">
          <span class="slider round"></span>
        </label>
        <span class="expl"> Les statistiques avancées vous permettent de connaître la position et la vitesse des
          robots </span>
      </div>

      <div id="box_admin" class="box">
        <label for="name" class="elt_admin" id="titre_admin">Vous avez un code administrateur?</label>
        <div id="form">
          <div class="elt_admin">
            <input type="text" class="form__input" id="name" placeholder="Code Administrateur" required="" />
          </div>
          <button id="button_admin" class="elt_admin">Valider</button>
        </div>
        <span class="expl"> Le code administrateur vous permet d'être prioritaire pour la file d'attente, et la capacité
          d'arrêter en urgence l'utilisation des robots par d'autres utilisateurs </span>
      </div>
    </div>
  </div>
</template>
