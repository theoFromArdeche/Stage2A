
const defaultState = {
	robotSocket: null,
	handHolder: null,
	curPosRobot: 'dockingstation2',
	curLocationRobot: 'Location: -384 1125 0',
	requestDict: null,
	interruptedRequest: null,
	handQueue: [],
	handTimer: null,
	handTimerStartTime: null,
	handTimeout: 5 * 60 * 1000,
	destDockPark: null,
	flagDockPark: false,
	statusTimer: null,
	statusInterval: 1 * 1000
};

const defaultStatus = {
	ExtendedStatusForHumans: 'Unknown',
	Status: 'Unknown',
	Location: '0 0 0',
	StateOfCharge: '0',
	LocalizationScore: '0',
	Temperature: '0'
};


const state = new Map();
const curStatus = new Map();
const connectedClients = new Map();
const adminClients = new Set();
var database = null;
var codeAdmin;


module.exports = {
	sendToRobot, sendToClient, sendToAllClients, setHandTimeout, updatePositions, sendStatus, deleteRobot, initializeClients,
	accessState, createRobot, accessDB, initializeRobotId, getRobotIds, accessStatus, getRobotId, getClientId, accessCodeAdmin,
	connectedClients, adminClients
}


function accessState(robotId, key, value) {
	if (!key && !value) return state.has(robotId);
	if (!state.has(robotId)) {
		console.log(`Error: unknown robotId (${robotId})`);
		return null;
	}
	if (value !== undefined) {
		state.get(robotId).set(key, value);  // setter
	}
	return state.get(robotId).get(key);  // getter
}


function accessStatus(robotId, key, value) {
	if (!key && !value) return curStatus.has(robotId);
	if (!curStatus.has(robotId)) {
		console.log(`Error: unknown robotId (${robotId})`);
		return null;
	}
	if (value !== undefined) {
		curStatus.get(robotId).set(key, value);  // setter
	}
	return curStatus.get(robotId).get(key);  // getter
}


function accessCodeAdmin(value) {
	if (value) codeAdmin=value;
	return codeAdmin;
}

function sendStatus(robotId, clientId) {
	for (let status of curStatus.get(robotId).values()) {
		sendToClient(clientId, status, robotId);
	}
}


function accessDB(newDB) {
	if (newDB !== undefined) {
			database = newDB;  // setter
	}
	return database;  // getter
}


function deepCopy(obj) {
	return new Map(Object.entries(JSON.parse(JSON.stringify(obj))));
}

function createRobot(host, port) {
	const robotId = getRobotId(host, port);
	state.set(robotId, deepCopy(defaultState));
	curStatus.set(robotId, deepCopy(defaultStatus));
	return robotId;
}

function deleteRobot(robotId, flagUpdateClients=true) {
	if (!state.has(robotId)) return;
	state.delete(robotId);
	curStatus.delete(robotId);

	if (!flagUpdateClients) return;

	for (let client of connectedClients.keys()) {
		if (connectedClients.get(client).get('robotId') !== robotId) continue;
		const newRobotId = state.keys().next().value;
		connectedClients.get(client).set('robotId', newRobotId);
		sendToClient(client, 'SELECTED ROBOTID', newRobotId);
	}
}

function getRobotId(host, port) {
	return `${host.replace(/\./g, '-')}_${port}`;
}

function getClientId(address, port) {
	return `${address}:${port}`;
}

function initializeRobotId() {
	//console.log(state.keys());
	return state.keys().next().value;
}

function getRobotIds() {
	return state.keys();
}

function initializeClients(robotId) {
	for (let client of connectedClients.keys()) {
		if (connectedClients.get(client).get(robotId)) continue;
		connectedClients.get(client).set('robotId', robotId);
	}
}


function sendToRobot(robotId, request) {
  new Promise((resolve, reject) => {
    // wait for the robot to be connected
    const checkConnection = () => {
      if (accessState(robotId)) {
        console.log(`(${robotId}) Send to robot: ${request}`);
        accessState(robotId, 'robotSocket').write(`${request}\n`, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        setTimeout(checkConnection, 100);
      }
    };
    checkConnection();
  });
}



function sendToClient(clientId, msg, robotIdOverwrite) {
	var robotId;
	if (robotIdOverwrite) robotId=robotIdOverwrite;
	else robotId = connectedClients.get(clientId).get('robotId');
	console.log(`(${robotId}) Send to client ${clientId}: ${msg}`);

	const socket = connectedClients.get(clientId).get('socket');
	if (!socket) return;
	for (let m of msg.split('\n')) {
		if (!m) continue;
		socket.write(`${robotId}: ${m}\n`);
	}
}



function sendToAllClients(robotId, msg, sendToAll=false) {
	if (!sendToAll) console.log(`(${robotId}) Send to every client with this robot : ${msg}`);
	else if (!robotId) console.log(`Send to everyone : ${msg}`);
	else console.log(`(${robotId}) Send to everyone : ${msg}`);

	for (let [clientId, dict] of connectedClients.entries()) {
		if (!sendToAll && robotId && dict.get('robotId')!=robotId) continue;
		const socket = dict.get('socket');
		for (let m of msg.split('\n')) {
			if (!m) continue;
			socket.write(`${robotId}: ${m}\n`);
		}
	}
}



function setHandTimeout(clientId) {
	const robotId = connectedClients.get(clientId).get('robotId');
	if (!accessState(robotId)) return;

	clearTimeout(accessState(robotId, 'handTimer'));
	accessState(robotId, 'handTimerStartTime', Date.now());
	accessState(robotId, 'handTimer', setTimeout(() => {
		if (accessState(robotId, 'handQueue').length===0) { // queue is empty
			accessState(robotId, 'handHolder', null);
		} else { // set the first client in the queue as the hand holder
			accessState(robotId, 'handHolder', accessState(robotId, 'handQueue')[0]);
			accessState(robotId, 'handQueue').shift();
			sendToClient(accessState(robotId, 'handHolder'), 'HAND REQUEST ACCEPTED\n');
			setHandTimeout(accessState(robotId, 'handHolder'));
			updatePositions(robotId);
		}
		sendToClient(clientId, 'HAND TIMEOUT\n');
	}, accessState(robotId, 'handTimeout')));
}



function updatePositions(robotId) {
	// notify each client in the queue of their new position
	for (let i=0; i<accessState(robotId, 'handQueue').length; i++) {
		sendToClient(accessState(robotId, 'handQueue')[i], `HAND QUEUE POSITION: ${i+1}\n`);
	}
	// notify everyone of the new size of the queue
	sendToAllClients(robotId, `HAND QUEUE UPDATE: ${accessState(robotId, 'handQueue').length}\n`, true);
}
