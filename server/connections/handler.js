

var robotSocket = null;
var robotConnected = false;
var handHolder = null;
var curPosRobot = 'dockingstation2';
var curLocationRobot = 'Location: -384 1125 0';
const connectedClients = new Map();
var handQueue = [];
const handTimeout = 60 * 1000;
var database;


module.exports = {
	sendToRobot, sendToClient, sendToAllClients, setHandTimeout, updatePositions,
	robotSocket, robotConnected, handHolder, curPosRobot, curLocationRobot, connectedClients, handQueue, database
}



function sendToRobot(request) {
  new Promise((resolve, reject) => {
    // wait for the robot to be connected
    const checkConnection = () => {
      if (robotConnected) {
        console.log(`Send to robot : ${request}`);
        robotSocket.write(`${request}\n`, (err) => {
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
	const socket = connectedClients.get(clientId);
	if (socket) socket.write(msg);
}



function sendToAllClients(msg) {
	console.log(`Send to everyone : ${msg}`)
	// iterate over the connectedClients map
	for (let [clientId, socket] of connectedClients.entries()) {
		// send the message to the client
		socket.write(msg);
	}
}



function setHandTimeout(clientId) {
	clearTimeout(handTimer);
	handTimer = setTimeout(() => {
		if (handQueue.length===0) { // queue is empty
			handHolder=null;
		} else { // set the first client in the queue as the hand holder
			handHolder = handQueue[0];
			handQueue.shift();
			sendToClient(handHolder, 'HAND REQUEST ACCEPTED\n');
			setHandTimeout(handHolder);
			updatePositions();
		}
		sendToClient(clientId, 'HAND TIMEOUT\n');
	}, handTimeout);
}



function updatePositions() {
	// notify each client in the queue of their new position
	for (let i=0; i<handQueue.length; i++) {
		sendToClient(handQueue[i], `HAND QUEUE POSITION: ${i+1}\n`);
	}
	// notify everyone of the new size of the queue
	sendToAllClients(`HAND QUEUE UPDATE: ${handQueue.length}\n`);
}
