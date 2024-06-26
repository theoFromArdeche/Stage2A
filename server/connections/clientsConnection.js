

var handler = require('./handler');

module.exports = { connectToClients }

const net = require('net');

const port_server = 2345;
const pingTiming = 5 * 60 * 1000;



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
	handler.accessState('adminClients').delete(clientId)
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

			var position = handler.accessState('handQueue').indexOf(clientId) + 1;
			if (position===0) { // clientId not in the queue
				if (handler.accessState('adminClients').has(clientId)) {
					// admin
					for (let i=0; i<handler.accessState('handQueue').length; i++) {
						const id = handler.accessState('handQueue')[i];
						if (!handler.accessState('adminClients').has(id)) {
							handler.accessState('handQueue').splice(i, 0, clientId);
							handler.updatePositions();
							break;
						}
					}
					position = handler.accessState('handQueue').indexOf(clientId) + 1;
				}

				if (position===0) {
					handler.accessState('handQueue').push(clientId);
					handler.sendToClient(clientId, `HAND QUEUE POSITION: ${handler.accessState('handQueue').length}\n`);
				}

				const sizeOfQueue = handler.accessState('handQueue').length;
				handler.sendToAllClients(`HAND QUEUE UPDATE: ${sizeOfQueue}\n`);

			} else handler.sendToClient(clientId, `HAND QUEUE POSITION: ${position}\n`);
		}

	} else if (msg === 'HAND BACK') {
		if (handler.accessState('handHolder')!==clientId) return;
		clearTimeout(handler.accessState('handTimer'));
		if (handler.accessState('handQueue').length===0) {
			handler.accessState('handHolder',null);
		} else {
			handler.accessState('handHolder', handler.accessState('handQueue')[0]);
			handler.accessState('handQueue').shift();
			handler.sendToClient(handler.accessState('handHolder'), 'HAND REQUEST ACCEPTED\n');
			handler.setHandTimeout(handler.accessState('handHolder'));
			handler.updatePositions();
		}
		handler.sendToClient(clientId, 'HAND TIMEOUT\n');

 	} else if (msg === 'DATA') {
		sendData(clientId);

	} else if (msg.startsWith('CODE ADMIN: ')) {
		const code = msg.substring('CODE ADMIN: '.length);
		if (code===handler.accessState('codeAdmin')) {
			handler.accessState('adminClients').add(clientId);
			handler.sendToClient(clientId, 'ADMIN REQUEST ACCEPTED\n');
			if (handler.accessState('handQueue').indexOf(clientId)!==-1) {
				handler.accessState('handQueue', handler.accessState('handQueue').filter((id) => id !== clientId));
				receiveRequest(clientId, 'HAND');
			}
		} else {
			handler.sendToClient(clientId, 'ADMIN REQUEST REJECTED\n');
		}

	} else if (msg === 'QUIT ADMIN') {
		if (!handler.accessState('adminClients').has(clientId)) return;

		if (handler.accessState('handQueue').indexOf(clientId)!==-1) {
			handler.accessState('handQueue', handler.accessState('handQueue').filter((id) => id !== clientId));
			receiveRequest(clientId, 'HAND');
		}

		handler.accessState('adminClients').delete(clientId);
		handler.sendToClient(clientId, 'ADMIN REQUEST REJECTED\n');

	} else if (msg === 'GET HAND LIST') {
		const handList = handler.accessState('handQueue');
		var resultStr = '';
		if (handler.accessState('handHolder')) {
			resultStr += `0: ${handler.accessState('handHolder')} `;
			if (handler.accessState('adminClients').has(handler.accessState('handHolder'))) {
				resultStr += `(admin) `;
			}
			const rawTime = Math.floor((handler.accessState('handTimeout') - Date.now() + handler.accessState('handTimerStartTime'))/1000);
			const minutes = Math.floor(rawTime/60);
			var seconds = rawTime%60;
			if (seconds<10) {
				seconds = '0'+seconds;
			}

			resultStr += `(Hand holder) time remaining : ${minutes}:${seconds},`;
		}
		for (let i=0; i<handList.length; i++) {
			if (handler.accessState('adminClients').has(handList[i])) {
				resultStr += `${i+1}: ${handList[i]} (admin),`;
			} else resultStr += `${i+1}: ${handList[i]},`;
		}
		handler.sendToClient(clientId, `HAND LIST: ${resultStr}\n`);

	} else if (msg.startsWith('REMOVE FROM HAND LIST: ')) {
		const index = parseInt(msg.substring('REMOVE FROM HAND LIST: '.length));
		if (index<0 || index>handler.accessState('handQueue').length) return;

		if (index===0) {
			receiveRequest(handler.accessState('handHolder'), 'HAND BACK');
		} else {
			handler.sendToClient(handler.accessState('handQueue')[index-1], 'HAND TIMEOUT\n');
			handler.accessState('handQueue').splice(index-1, 1);
			handler.updatePositions();
		}
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
