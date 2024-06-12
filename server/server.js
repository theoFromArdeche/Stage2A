

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const compression = require('compression');
const { connectToDatabase, getDatabase }  = require('./data/database');
const { connectToRobot } = require('./connections/robotConnection');
const { connectToClients } = require('./connections/clientsConnection');
var handler = require('./connections/handler')

const app = express();
const port_map = 3001;



// FETCH THE MAP

const mapData = fs.readFileSync('./data/map_loria.txt', 'utf8');



// MAKE THE MAP AVAILABLE FOR THE CLIENTS

app.use(cors());
app.use(compression());


app.get('/map', (request, client) => {
  client.send(mapData);
});

app.listen(port_map, () => {
  console.log(`File server is running on http://localhost:${port_map}`);
});



// CONNECT TO THE DATABASE

function connectDB() {
	connectToDatabase(async error => {
		if (error) {
			console.log('Could not connect to the database, retry in 5 seconds');
			setTimeout(connectDB, 5000); // 5 seconds
		} else {
			console.log('Connected to the database');
			if (!mapData) {
				console.log('Map could not be loaded');
				return;
			}
			handler.accessState('database', getDatabase());
			await updateDatabase();
			startServer();
		}
	})
}

connectDB();



async function updateDatabase() {
	const interestPoints = [];
	const lines = mapData.split('\n');
  for (const line of lines) {
		if (line.startsWith('Cairn:') && !line.includes('ForbiddenLine') && !line.includes('ForbiddenArea')) {
			interestPoints.push(getName(line));
		}
  }


	// look for new interrestPoints
	const newInterrestPoints = []
	for (let point of interestPoints) {
		await handler.accessState('database').collection('labels')
		.findOne({label: point})
		.then(doc => {
			if (!doc) {
				newInterrestPoints.push({label: point});
			}
		})
	}


	// delete the useless interestPoints
	for (let collection of ['labels', 'fails', 'successes', 'times']) {
		await handler.accessState('database').collection(collection).deleteMany({label: {$nin: interestPoints}})
	}


	// update the old interestPoints
	for (let collection of ['fails', 'successes', 'times']) {
		await handler.accessState('database').collection(collection).find().forEach(doc => {
			const fails = new Map(Object.entries(doc[collection]));

			// delete useless points
			for (let point of fails.keys()) {
				if (!interestPoints.includes(point)) {
					fails.delete(point)
				}
			}

			// add new points
			newInterrestPoints.forEach(point => {
				fails.set(point.label, 0)
			})

			handler.accessState('database').collection(collection).updateOne(
				{_id: doc._id},
				{$set: {[collection]: fails}}
			)
		});
	}


	if (newInterrestPoints.length===0) return;

	// add the new interestPoints
	handler.accessState('database').collection('labels').insertMany(newInterrestPoints);

	const allPoints = new Map();
	interestPoints.forEach(point => {
		allPoints.set(point, 0)
	})

	for (let collection of ['fails', 'successes', 'times']) {
		const insert = [];
		newInterrestPoints.forEach(point => {
			insert.push({
				'label': point.label,
				[collection]: allPoints
			})
		})
		handler.accessState('database').collection(collection).insertMany(insert)
	}
}



function getName(line) {
  const regex = /ICON\s+"([^"]+)"/
  const match = line.match(regex)
  return match[1].toLowerCase()
}



// CONNECT TO THE ROBOT AND THE CLIENTS

function startServer() {
	connectToRobot();
	connectToClients();
}









/*

// FETCH THE DATA

const jsonString = fs.readFileSync('./data.json', 'utf8').toLowerCase();

// Parse the JSON string
var data;
try {
  data = JSON.parse(jsonString);
} catch (err) {
  console.log('Error parsing JSON:', err);
}


data.id = new Map(Object.entries(data.id));
//console.log(data);

*/






/*


2) modifer le code en enlevant la variable data, on veut acceder a la db et la modifier quand il faut
il faudra modifier l'envoie de data aux instances

*/








// https://github.com/OmronAPAC/Omron_LD_ROS_Package/blob/master/docs/DeveloperGuide.adoc#map-loading-reading


// https://github.com/OmronAPAC/Omron_LD_ROS_Package/issues/5





// MangoDB

// Process
// https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/#std-label-install-mdb-community-ubuntu



// Compass (gui app)
// https://www.mongodb.com/try/download/atlascli

