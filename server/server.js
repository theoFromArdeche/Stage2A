

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const compression = require('compression');
const { connectToDatabase, getDatabase }  = require('./data/database');
const { connectToRobot } = require('./connections/robotConnection');
const { connectToClients } = require('./connections/clientsConnection');
var handler = require('./connections/handler')

const app = express();
const mapPort = 3001;
const robotPort = [3456, 3457, 3458];
const robotHost = ['127.0.0.1', '127.0.0.1', '127.0.0.1'];
const robotPassword = ['password', 'password', 'password'];
const whitelistLive = [[''], ['::ffff:127.0.0'], ['::ffff:127.0.0']];
const serverPort = 2345;
const codeAdmin = 'admin';

if (robotHost.length !== robotPort.length || robotPort.length !== robotPassword.length) {
	handler.consoleLog('Error: robotHost, robotPort and robotPassword have different length');
	return;
}



// MAKE THE MAPS AVAILABLE FOR THE CLIENTS

app.use(cors());
app.use(compression());

for (let i=0; i<robotHost.length; i++) {
	const robotId = handler.getRobotId(robotHost[i], robotPort[i]);
	const mapData = fs.readFileSync(`./data/map_${robotId}.txt`, 'utf8');
	if (!mapData) {
		handler.consoleLog('Map could not be loaded');
		return;
	}
	app.get(`/map_${robotId}`, (request, client) => {
		client.send(mapData);
	});
}



app.listen(mapPort, () => {
  handler.consoleLog(`File server is running on http://localhost:${mapPort}`);
});



// CONNECT AND UPDATE THE DATABASE

function connectDB() {
	connectToDatabase(async error => {
		if (error) {
			handler.consoleLog('Could not connect to the database, retry in 5 seconds');
			setTimeout(connectDB, 5000); // 5 seconds
		} else {
			handler.consoleLog('Connected to the database');
			handler.accessDB(getDatabase());
			for (let i=0; i<robotHost.length; i++) {
				await updateDatabase(handler.getRobotId(robotHost[i], robotPort[i]));
			}
			startServer();
		}
	})
}

connectDB();



async function updateDatabase(robotId) {
	const mapData = fs.readFileSync(`./data/map_${robotId}.txt`, 'utf8');

	const interestPoints = [];
	const interestPointsCoords = new Map();
	const lines = mapData.split('\n');
  for (const line of lines) {
		if (line.startsWith('Cairn:') && !line.includes('ForbiddenLine') && !line.includes('ForbiddenArea')) {
			const name = getName(line), coords = getCoords(line);
			interestPoints.push(name);
			interestPointsCoords.set(name, coords);
		}
  }

	handler.accessInterrestPointsCoords(robotId, interestPointsCoords);


	// look for new interrestPoints
	const newInterrestPoints = [];
	for (let point of interestPoints) {
		await handler.accessDB().collection(`labels_${robotId}`)
		.findOne({label: point})
		.then(doc => {
			if (!doc) {
				newInterrestPoints.push({label: point});
			}
		})
	}


	// delete the useless interestPoints
	for (let collection of ['labels', 'fails', 'successes', 'times']) {
		await handler.accessDB().collection(`${collection}_${robotId}`).deleteMany({label: {$nin: interestPoints}});
	}


	// update the old interestPoints
	for (let collection of ['fails', 'successes', 'times']) {
		await handler.accessDB().collection(`${collection}_${robotId}`).find().forEach(doc => {
			const fails = new Map(Object.entries(doc[collection]));

			// delete useless points
			for (let point of fails.keys()) {
				if (!interestPoints.includes(point)) {
					fails.delete(point);
				}
			}

			// add new points
			newInterrestPoints.forEach(point => {
				fails.set(point.label, 0);
			})

			handler.accessDB().collection(`${collection}_${robotId}`).updateOne(
				{_id: doc._id},
				{$set: {[collection]: fails}}
			)
		});
	}


	if (newInterrestPoints.length===0) return;

	// add the new interestPoints
	handler.accessDB().collection(`labels_${robotId}`).insertMany(newInterrestPoints);

	const allPoints = new Map();
	interestPoints.forEach(point => {
		allPoints.set(point, 0);
	})

	for (let collection of ['fails', 'successes', 'times']) {
		const insert = [];
		newInterrestPoints.forEach(point => {
			insert.push({
				'label': point.label,
				[collection]: allPoints
			})
		})
		handler.accessDB().collection(`${collection}_${robotId}`).insertMany(insert);
	}
}



function getName(line) {
  const regex = /ICON\s+"([^"]+)"/;
  const match = line.match(regex);
  return match[1].toLowerCase();
}

function isDigit(charac) {
	return '0' <= charac && charac <= '9';
}

function getCoords(line) {
  const coords = [0, 0, 0]
  let pointeur = 0
  let i = 0
  let temp = ''

  while (pointeur <= 2 && i < line.length) {
    if (line[i] === '-' || (line[i] === '.' && isDigit(line[i + 1])) || isDigit(line[i])) {
      temp += line[i]
    } else if (temp !== '' && line[i] === ' ') {
      coords[pointeur] = parseFloat(temp)
      temp = ''
      pointeur += 1
    }
    i += 1
  }
  return coords
}



// CONNECT TO THE ROBOT AND THE CLIENTS

function startServer() {
	handler.accessCodeAdmin(codeAdmin);
	for (let i=0; i<robotHost.length; i++) {
		connectToRobot(robotHost[i], robotPort[i], robotPassword[i]);
	}
	for (let i=0; i<whitelistLive.length; i++) {
		const robotId = handler.getRobotId(robotHost[i], robotPort[i]);
		handler.accessWhitelistLive(robotId, whitelistLive[i]);
	}
	connectToClients(serverPort);
}






// https://github.com/OmronAPAC/Omron_LD_ROS_Package/blob/master/docs/DeveloperGuide.adoc#map-loading-reading


// https://github.com/OmronAPAC/Omron_LD_ROS_Package/issues/5





// MangoDB

// Process
// https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/#std-label-install-mdb-community-ubuntu



// Compass (gui app)
// https://www.mongodb.com/try/download/atlascli


