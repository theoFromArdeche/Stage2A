
var state = {
	robotSocket: null,
	robotConnected: false,
	handHolder: null,
	curPosRobot: 'dockingstation2',
	curLocationRobot: 'Location: -384 1125 0',
	connectedClients: new Map(),
	adminClients: new Set(),
	requestDict: null,
	interruptedRequest: null,
	handQueue: [],
	handTimer: null,
	handTimeout: 5 * 60 * 1000,
	database: null,
	codeAdmin: "admin"
};


module.exports = {
	sendToRobot, sendToClient, sendToAllClients, setHandTimeout, updatePositions, accessState
}


function accessState(key, value) {
	if (value !== undefined) {
			state[key] = value;  // setter
	}
	return state[key];  // getter
}





function sendToRobot(request) {
  new Promise((resolve, reject) => {
    // wait for the robot to be connected
    const checkConnection = () => {
      if (accessState('robotConnected')) {
        console.log(`Send to robot : ${request}`);
        accessState('robotSocket').write(`${request}\n`, (err) => {
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



function sendToClient(clientId, msg) {
	console.log(`Send to client ${clientId}: ${msg}`);
	// get the socket for the client from the connected clients map
	const socket = accessState('connectedClients').get(clientId);
	if (socket) socket.write(msg);
}



function sendToAllClients(msg) {
	console.log(`Send to everyone : ${msg}`)
	for (let [clientId, socket] of accessState('connectedClients').entries()) {
		socket.write(msg);
	}
}



function setHandTimeout(clientId) {
	clearTimeout(accessState('handTimer'));
	accessState('handTimer', setTimeout(() => {
		if (accessState('handQueue').length===0) { // queue is empty
			accessState('handHolder', null);
		} else { // set the first client in the queue as the hand holder
			accessState('handHolder', accessState('handQueue')[0]);
			accessState('handQueue').shift();
			sendToClient(accessState('handHolder'), 'HAND REQUEST ACCEPTED\n');
			setHandTimeout(accessState('handHolder'));
			updatePositions();
		}
		sendToClient(clientId, 'HAND TIMEOUT\n');
	}, accessState('handTimeout')));
}



function updatePositions() {
	// notify each client in the queue of their new position
	for (let i=0; i<accessState('handQueue').length; i++) {
		sendToClient(accessState('handQueue')[i], `HAND QUEUE POSITION: ${i+1}\n`);
	}
	// notify everyone of the new size of the queue
	sendToAllClients(`HAND QUEUE UPDATE: ${accessState('handQueue').length}\n`);
}
