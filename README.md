# Stage 2A

Fork de [ce repo](https://github.com/PIDR-2023/PIDR)


# Installation du server

## Prérequis

Pour l'application et le server il est obligatoire d'avoir Node.js et npm d'installé.
https://nodejs.org/en/download/package-manager

(Pour l'installation de l'application avec un installeur il n'y a aucuns prérequis)

## Installation des dépendances

~~~
cd server
npm install
~~~

## Connexion a la database


### I. Prérequis 
Le service fonctionne avec une base de donnée mongodb, si vous n'en avez pas vous pouvez installer les outils nécéssaires ici : https://www.mongodb.com/try/download/community

Tout est détaillé ici : https://www.youtube.com/watch?v=gDOKSgqM-bQ


### II. Connexion

Pour lier votre database au service, il suffit de modifier le host, le port et le nom de la database utilisée dans server/data/database.js ligne 12. Par défaut le service essaye de se connecter à cette database : localhost:27017/AIPL

## Ajout/supression d'un robot

### I. Mofidier server.js

Dans server/server.js, modifier les lignes 14 à 17

Exemple :
~~~js
const robotPort = [3456, 3457, 3458];
const robotHost = ['127.0.0.1', '127.0.0.1', '127.0.0.1'];
const robotPassword = ['password', 'password', 'password'];
const whitelistLive = [[''], ['::ffff:127.0.0'], ['::ffff:127.0.0']];
~~~

> Pour chaque robots la whiteList correspond aux préfix des adresses qui ont accès au Live pour ce robot (les adresses qui ont le même préfix qu'une des adresses de la whiteList du robot pourront envoyer des requêtes au robot réel). Si la liste est vide, aucune requetes ne sera envoyé au robot, et si la liste contient uniquement '' alors tous les clients pourront accéder au Live pour ce robot.


### II. Ajouter la carte du robot
Télécharger la carte du robot sur une application tier le permettant puis L'ajouter dans server/data/map_host_port en replacant le host et le port par les bonnes valeurs (le host sera avec des tirets, exemple : 127-0-0-1).


### III. Relancer le server

Pour finaliser l'ajout d'un robot il est impératif de relancer le server si il était déjà en fonctionnement. Cela permet de créer toutes les collections nécéssaires dans la database et de rendre le robot disponible aux utilisateurs.

> Note : Les robots sont identifiés dans le server et l'application avec leur host et leur port comme ceci : host_port

### IV: Initialiser les valeurs (optionnel)

Par défaut, toutes les valeurs de temps sont initialisées à 0. Pour donner des valeurs plus proches de la réalité que 0 sans avoir à déplacer le robot pendant des heures, il est possible d'utiliser un algotithme.

Pour cela il faut chronométrer le robot d'un point d'intéret A à un point d'intéret B, renseigner ces valeurs lignes 588 à 591 avec l'identifiant du robot (host_port).

Puis lancer l'algorithme avec ces commandes : 
~~~
cd server/data
node generateTimes.js
~~~


# Installation de l'application


## Avec npm

Installer les dépendances

~~~
cd application
npm install
~~~

Lancer l'application
~~~
npm run start
~~~

#### Générer un installeur
~~~
npm run build:win
npm run build:mac
npm run build:linux
~~~
