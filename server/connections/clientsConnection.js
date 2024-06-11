

module.exports = { connectToClients }

var {
	sendToRobot, sendToClient, sendToAllClients, setHandTimeout, updatePositions,
	handHolder, curPosRobot, curLocationRobot, connectedClients, handQueue, database
} = require('./handler');


const net = require('net');

const port_server = 2345;
var handTimer = null;
const pingTiming = 60 * 1000;



function connectToClients() {
	const server = net.createServer((socket) => {
		console.log('Client connected');
		console.log('Client socket info:', socket.address());

		// create a unique identifier for the client
		const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
		console.log(`Client connected with id: ${clientId}`);

		// add the socket to the connected clients map
		connectedClients.set(clientId, socket);

		// update the client
		updateClientQueue(clientId);

		// send a ping to the client every 5 seconds to check if it's still there
		const pingInterval = setInterval(() => {
			socket.write('PING\n');
		}, pingTiming);

		// received data from the client
		socket.on('data', (data) => {
			const msg = data.toString().trim();
			receiveRequest(clientId, msg);
		});

		// client disconnected
		socket.on('end', () => {
			console.log('Client disconnected');
			console.log('Client socket info:', socket.address());
			socketDisconnect(clientId, pingInterval)
		});

		// Event handler for errors
		socket.on('error', (err) => {
			console.error('Socket error:', err);
			socketDisconnect(clientId, pingInterval)
		});
	});

	server.listen(port_server, () => {
		console.log(`Telnet server listening on port ${port_server}`);
	});
}





function socketDisconnect(clientId, pingInterval) {
	// remove the socket from the connected clients map
	connectedClients.delete(clientId);
	// stop the ping interval
	clearInterval(pingInterval);
	// remove the client from the request queue
	handQueue = handQueue.filter((id) => id !== clientId);
	// if the client was the hand holder, set a new owner
	if (handHolder === clientId) {
		clearTimeout(handTimer);
		if (handQueue.length===0) {
			handHolder=null;
		} else {
			handHolder = handQueue[0];
			handQueue.shift();
			sendToClient(handHolder, 'HAND REQUEST ACCEPTED\n');
			setHandTimeout(handHolder);
		}
	}

	// update the clients
	updatePositions();
}

function updateClientQueue(clientId) {
	sendToClient(clientId, `HAND QUEUE UPDATE: ${handQueue.length}\n`)
}




function receiveRequest(clientId, msg) {
	// a request is received, the timer is reset

	console.log(`Received from client ${clientId}: ${msg}`);
	if (msg === 'PING') {
		return;
	} else if (msg.startsWith('REQUEST: ')) {

		if (handHolder != clientId) return;
		setHandTimeout(handHolder);

		const request = msg.substring('REQUEST: '.length).toLowerCase();
		if (!request.startsWith('goto ')&&request!=='dock') {
			//console.log('invalid command\n');
			sendToRobot(request)
			return;
		}

		var dest;
		if (request === 'dock') {
			dest = 'dockingstation2';
		} else {
			dest = request.substring('goto '.length);
		}
		if (!data.id.has(dest)) {
			//console.log('invalid destination\n');
			sendToClient(clientId, `RESPONSE: Unknown destination ${dest}\n`); // TEMPORAIRE
			return;
		}

		requestDict = {time: Date.now(), dest: dest};

		// send the request to the robot
		sendToRobot(request)

		// the timeout will be rest when the response is received
		clearTimeout(handTimer);

	} else if (msg === 'HAND') {
		if (!handHolder) {
			// the hand is available and given to the client
			handHolder=clientId;
			sendToClient(clientId, 'HAND REQUEST ACCEPTED\n');
			setHandTimeout(clientId);
		} else {
			if (handHolder==clientId) {
				sendToClient(clientId, 'YOU ALREADY HAVE THE HAND\n');
				return;
			}
			// the hand is not available
			position = handQueue.indexOf(clientId) + 1;
			if (position==0) { // clientId not in the queue
				handQueue.push(clientId);
				position=handQueue.length
				sendToAllClients(`HAND QUEUE UPDATE: ${position}\n`);
			}
			sendToClient(clientId, `HAND QUEUE POSITION: ${position}\n`);
		}
	} else if (msg === 'DATA') {
		const jsonString = JSON.stringify(data, (key, value) => {
			// If the value is a Map, convert it to an object
			if (value instanceof Map) {
				return Object.fromEntries(value.entries());
			}
			// Otherwise, return the value as is
			return value;
		});
		sendToClient(clientId, `DATA: ${jsonString}FLAG_SPLIT${curPosRobot}\n${curLocationRobot}\n`);
	}
}

