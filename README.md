# Stage 2A

Fork de [ce repo](https://github.com/PIDR-2023/PIDR)

[Click here for the English version](#english-version)

# Installation du serveur

## Prérequis

Pour l'application et le serveur, il est obligatoire d'avoir [Node.js et npm](https://nodejs.org/fr/download/package-manager) installés.

> Note: Pour l'installation de l'application avec un installeur, il n'y a aucun prérequis.

## Installation des dépendances

~~~bash
cd server
npm install
~~~

## Connexion à la base de données

### I. Prérequis 
Le serveur fonctionne avec une base de données MongoDB. Si vous n'en avez pas, vous pouvez installer les outils nécessaires ici : [Télécharger MongoDB](https://www.mongodb.com/try/download/community).

Tout est détaillé dans ce [tutoriel YouTube](https://www.youtube.com/watch?v=gDOKSgqM-bQ).

### II. Connexion

Pour lier votre base de données au serveur, il suffit de modifier le host, le port et le nom de la base de données utilisés dans `server/data/database.js` ligne `12`. Par défaut, le serveur essaye de se connecter à cette base de données : `localhost:27017/AIPL`.

## Ajout/suppression d'un robot

### I. Modifier `server.js`

Dans `server/server.js`, modifiez les lignes `14` à `17`.

Exemple :
~~~js
const robotPort = [3456, 3457, 3458];
const robotHost = ['127.0.0.1', '127.0.0.1', '127.0.0.1'];
const robotPassword = ['password', 'password', 'password'];
const whitelistLive = [[''], ['::ffff:127.0.0'], ['::ffff:127.0.0']];
~~~

> Pour chaque robot, la whiteList correspond aux préfixes des adresses qui ont accès au Live pour ce robot (les adresses qui ont le même préfixe qu'une des adresses de la whiteList du robot pourront envoyer des requêtes au robot réel). Si la liste est vide, aucune requête ne sera envoyée au robot, et si la liste contient uniquement '', alors tous les clients pourront accéder au Live pour ce robot.

### II. Ajouter la carte du robot

Téléchargez la carte du robot à l'aide d'une application tierce le permettant puis ajoutez-la dans `server/data/map_host_port` en remplaçant le `host` et le `port` par les bonnes valeurs (le host sera avec des tirets, exemple : `127-0-0-1`).

### III. Relancer le serveur

Pour finaliser l'ajout d'un robot, il est impératif de relancer le serveur s'il était déjà en fonctionnement. Cela permet de créer toutes les collections nécessaires dans la base de données et de rendre le robot disponible aux utilisateurs.

> Note : Les robots sont identifiés dans le serveur et l'application avec leur host et leur port comme ceci : `host_port`, exemple : `127-0-0-1_1234`.

### IV. Initialiser les valeurs (optionnel)

Par défaut, toutes les valeurs de temps sont initialisées à `0`. Pour donner des valeurs plus proches de la réalité sans avoir à déplacer le robot pendant des heures, il est possible d'utiliser un algorithme.

Pour cela, il faut chronométrer le robot d'un point d'intérêt A à un point d'intérêt B, renseigner ces valeurs lignes `588` à `591` avec l'identifiant du robot (`host_port`).

Puis lancez l'algorithme avec ces commandes :
~~~bash
cd server/data
node generateTimes.js
~~~

# Installation de l'application

## Avec npm

Installer les dépendances

~~~bash
cd application
npm install
~~~

Lancer l'application
~~~bash
npm run dev
~~~

### Générer un installeur
~~~bash
npm run build:win
npm run build:mac
npm run build:linux
~~~

## Sans npm

Il suffit d'installer l'application avec l'installeur donné (ou d'en générer un avant avec npm).

---

# <a name="english-version"></a>English version

# Server Installation

## Prerequisites

Ensure you have Node.js and npm installed.
You can find installation instructions here: [Node.js](https://nodejs.org/en/download/package-manager).

(Note: For installing the application with an installer, there are no prerequisites.)

## Installing Dependencies

```bash
cd server
npm install
```

## Connecting to the Database

### I. Prerequisites 
The server requires a MongoDB database. If you don't have one, you can install the necessary tools here: [MongoDB download](https://www.mongodb.com/try/download/community).

Detailed instructions can be found in this [YouTube tutorial](https://www.youtube.com/watch?v=gDOKSgqM-bQ).

### II. Connecting

To link your database to the server, modify the host, port, and database name in `server/data/database.js` on line `12`. By default, the server attempts to connect to this database: `localhost:27017/AIPL`.

## Adding/Removing a Robot

### I. Modify `server.js`

In `server/server.js`, modify lines `14` to `17`.

Example:
```js
const robotPort = [3456, 3457, 3458];
const robotHost = ['127.0.0.1', '127.0.0.1', '127.0.0.1'];
const robotPassword = ['password', 'password', 'password'];
const whitelistLive = [[''], ['::ffff:127.0.0'], ['::ffff:127.0.0']];
```

> For each robot, the whiteList corresponds to the prefixes of the addresses that have access to the Live for that robot. If the list is empty, no requests will be sent to the robot. If the list contains only an empty string, then all clients will be able to access the Live for that robot.

### II. Add the Robot's Map

Download the robot's map using a third-party application, then add it to `server/data/map_host_port` by replacing the host and port with the correct values (the host should be formatted with hyphens, e.g., `127-0-0-1`).

### III. Restart the Server

To finalize adding a robot, you must restart the server if it was already running. This creates all necessary collections in the database and makes the robot available to users.

> Note: Robots are identified in the server and the application using their host and port in this format: `host_port`.

### IV. Initialize Values (Optional)

By default, all time values are initialized to `0`. To set more realistic values without having to move the robot for hours, you can use an algorithm.

To do this, time the robot from point A to point B and enter these values in lines `588` to `591` with the robot's identifier (`host_port`).

Then run the algorithm with these commands:
```bash
cd server/data
node generateTimes.js
```

# Application Installation

## With npm

Install the dependencies:
```bash
cd application
npm install
```

Start the application:
```bash
npm run dev
```

### Generate an Installer
```bash
npm run build:win
npm run build:mac
npm run build:linux
```

## Without npm

Just install the application with the provided installer (or generate one before with npm).
