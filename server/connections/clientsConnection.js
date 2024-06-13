

var handler = require('./handler');

module.exports = { connectToClients }

const net = require('net');

const port_server = 2345;
const pingTiming = 60 * 1000;



function connectToClients() {
	const server = net.createServer((socket) => {
		console.log('Client connected');
		console.log('Client socket info:', socket.address());

		// create a unique identifier for the client
		const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
		console.log(`Client connected with id: ${clientId}`);

		// add the socket to the connected clients map
		handler.accessState('connectedClients').set(clientId, socket);

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
	handler.accessState('connectedClients').delete(clientId);
	// stop the ping interval
	clearInterval(pingInterval);
	// remove the client from the request queue
	handler.accessState('handQueue', handler.accessState('handQueue').filter((id) => id !== clientId));
	// if the client was the hand holder, set a new owner
	if (handler.accessState('handHolder') === clientId) {
		clearTimeout(handler.accessState('handTimer'));
		if (handler.accessState('handQueue').length===0) {
			handler.accessState('handHolder',null);
		} else {
			handler.accessState('handHolder', handler.accessState('handQueue')[0]);
			handler.accessState('handQueue').shift();
			handler.sendToClient(handler.accessState('handHolder'), 'HAND REQUEST ACCEPTED\n');
			handler.setHandTimeout(handler.accessState('handHolder'));
		}
	}

	// update the clients
	handler.updatePositions();
}

function updateClientQueue(clientId) {
	handler.sendToClient(clientId, `HAND QUEUE UPDATE: ${handler.accessState('handQueue').length}\n`)
}




function receiveRequest(clientId, msg) {
	// a request is received, the timer is reset

	console.log(`Received from client ${clientId}: ${msg}`);
	if (msg === 'PING') {
		return;
	} else if (msg.startsWith('REQUEST: ')) {

		if (handler.accessState('handHolder') != clientId) return;
		handler.setHandTimeout(handler.accessState('handHolder'));

		const request = msg.substring('REQUEST: '.length).toLowerCase();
		if (!request.startsWith('goto ')&&request!=='dock') {
			//console.log('invalid command\n');
			handler.sendToRobot(request)
			return;
		}

		var dest;
		if (request === 'dock') {
			dest = 'dockingstation2';
		} else {
			dest = request.substring('goto '.length);
		}

		/*
		if (!data.id.has(dest)) {
			//console.log('invalid destination\n');
			handler.sendToClient(clientId, `RESPONSE: Unknown destination ${dest}\n`); // TEMPORAIRE
			return;
		}*/
		if (!handler.accessState('interruptedRequest')) {
			handler.accessState('requestDict', {time: Date.now(), dest: dest});
		}

		// send the request to the robot
		handler.sendToRobot(request)

		// the timeout will be rest when the response is received
		clearTimeout(handler.accessState('handTimer'));

	} else if (msg === 'HAND') {
		if (!handler.accessState('handHolder')) {
			// the hand is available and given to the client
			handler.accessState('handHolder',clientId);
			handler.sendToClient(clientId, 'HAND REQUEST ACCEPTED\n');
			handler.setHandTimeout(clientId);
		} else {
			if (handler.accessState('handHolder')==clientId) {
				handler.sendToClient(clientId, 'YOU ALREADY HAVE THE HAND\n');
				return;
			}
			// the hand is not available
			position = handler.accessState('handQueue').indexOf(clientId) + 1;
			if (position==0) { // clientId not in the queue
				handler.accessState('handQueue').push(clientId);
				position=handler.accessState('handQueue').length
				handler.sendToAllClients(`HAND QUEUE UPDATE: ${position}\n`);
			}
			handler.sendToClient(clientId, `HAND QUEUE POSITION: ${position}\n`);
		}
	} else if (msg === 'DATA') {
		sendData(clientId);
	}
}



async function sendData(clientId) {
	const data = new Map();
	data.set('id', new Map());

	var id=0;
	await handler.accessState('database').collection('labels').find().forEach(doc => {
		data.get('id').set(doc.label, id)
		id++;
	});

	for (let collection of ['fails', 'successes', 'times']) {
		data.set(collection, new Array(id));
		await handler.accessState('database').collection(collection).find().forEach(doc => {
			const row = new Array(id);
			Object.entries(doc[collection]).forEach(element => {
				row[data.get('id').get(element[0])]=element[1];
			})
			data.get(collection)[data.get('id').get(doc.label)]=row;
		});
	}

	const jsonString = JSON.stringify(data, (key, value) => {
		if (value instanceof Map) {
			return Object.fromEntries(value.entries());
		}
		return value;
	});
	handler.sendToClient(clientId, `DATA: ${jsonString}FLAG_SPLIT${handler.accessState('curPosRobot')}\n${handler.accessState('curLocationRobot')}\n`);
}
