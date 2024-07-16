

var handler = require('./handler');

module.exports = { connectToClients }

const net = require('net');


function connectToClients(port) {
	const server = net.createServer((socket) => {
		console.log('Client connected');
		console.log('Client socket info:', socket.address());

		// create a unique identifier for the client
		const clientId = handler.getClientId(socket.remoteAddress, socket.remotePort);
		console.log(`Client connected with id: ${clientId}`);

		// add the socket to the connected clients map
		const robotId = handler.initializeRobotId();
		handler.connectedClients.set(clientId, new Map([['socket', socket], ['robotId', robotId]]));


		// received data from the client
		socket.on('data', (data) => {
			const msg = data.toString().trim();
			for (let m of msg.split('\n')) {
				if (!m) continue;
				receiveRequest(clientId, m);
			}
		});

		// client disconnected
		socket.on('end', () => {
			console.log('Client disconnected');
			console.log('Client socket info:', socket.address());
			socketDisconnect(clientId)
		});

		// Event handler for errors
		socket.on('error', (err) => {
			console.error('Socket error:', err);
			socketDisconnect(clientId)
		});
	});

	server.listen(port, () => {
		console.log(`Telnet server listening on port ${port}`);
	});
}





function socketDisconnect(clientId) {
	const robotId = handler.connectedClients.get(clientId).get('robotId');
	// remove the socket from the connected clients map
	handler.connectedClients.delete(clientId);
	handler.adminClients.delete(clientId);

	removeClientFromQueue(clientId, robotId);
}


function removeClientFromQueue(clientId, robotId) {
	if (!handler.accessState(robotId)) return;

	// remove the client from the request queue
	handler.accessState(robotId, 'handQueue', handler.accessState(robotId, 'handQueue').filter((id) => id !== clientId));
	// if the client was the hand holder, set a new owner
	if (handler.accessState(robotId, 'handHolder') === clientId) {
		clearTimeout(handler.accessState(robotId, 'handTimer'));
		if (handler.accessState(robotId, 'handQueue').length===0) {
			handler.accessState(robotId, 'handHolder',null);
		} else {
			handler.accessState(robotId, 'handHolder', handler.accessState(robotId, 'handQueue')[0]);
			handler.accessState(robotId, 'handQueue').shift();
			handler.sendToClient(handler.accessState(robotId, 'handHolder'), 'HAND REQUEST ACCEPTED\n');
			handler.setHandTimeout(handler.accessState(robotId, 'handHolder'));
		}
	}

	// update the clients
	handler.updatePositions(robotId);
}


function updateClientQueue(clientId, robotIdOverwrite) {
	var robotId;
	if (robotIdOverwrite) robotId=robotIdOverwrite;
	else robotId = handler.connectedClients.get(clientId).get('robotId');
	handler.sendToClient(clientId, `HAND QUEUE UPDATE: ${handler.accessState(robotId, 'handQueue').length}\n`, robotId);
}




function receiveRequest(clientId, msg) {
	// a request is received, the timer is reset
	const robotId = handler.connectedClients.get(clientId).get('robotId');

	console.log(`(${robotId}) Received from client ${clientId}: ${msg}`);
	if (!handler.accessState(robotId) && !msg.startsWith('CODE ADMIN: ') && !msg.startsWith('QUIT ADMIN')) {
		console.log(`(${robotId}) Unknown robot id`);
		return;
	}

	if (msg.startsWith('REQUEST: ')) {

		if (handler.accessState(robotId, 'handHolder') != clientId) return;
		handler.setHandTimeout(handler.accessState(robotId, 'handHolder'));

		const request = msg.substring('REQUEST: '.length).toLowerCase();
		if (!request.startsWith('goto ')&&request!=='dock') {
			//console.log('invalid command\n');
			handler.sendToRobot(robotId, request)
			return;
		}

		var dest;
		if (request === 'dock') {
			dest = 'dockingstation2';
		} else {
			dest = request.substring('goto '.length);
		}


		// send the request to the robot
		handler.sendToRobot(robotId, request)

		// the timeout will be rest when the response is received
		clearTimeout(handler.accessState(robotId, 'handTimer'));

	} else if (msg === 'HAND') {
		if (!handler.accessState(robotId, 'handHolder')) {
			// the hand is available and given to the client
			handler.accessState(robotId, 'handHolder',clientId);
			handler.sendToClient(clientId, 'HAND REQUEST ACCEPTED\n');
			handler.setHandTimeout(clientId);
		} else {
			if (handler.accessState(robotId, 'handHolder')===clientId) {
				handler.sendToClient(clientId, 'YOU ALREADY HAVE THE HAND\n');
				return;
			}

			// the hand is not available

			var position = handler.accessState(robotId, 'handQueue').indexOf(clientId) + 1;
			if (position===0) { // clientId not in the queue
				if (handler.adminClients.has(clientId)) {
					// admin
					for (let i=0; i<handler.accessState(robotId, 'handQueue').length; i++) {
						const id = handler.accessState(robotId, 'handQueue')[i];
						if (!handler.adminClients.has(id)) {
							handler.accessState(robotId, 'handQueue').splice(i, 0, clientId);
							handler.updatePositions(robotId);
							break;
						}
					}
					position = handler.accessState(robotId, 'handQueue').indexOf(clientId) + 1;
				}

				if (position===0) {
					handler.accessState(robotId, 'handQueue').push(clientId);
					handler.sendToClient(clientId, `HAND QUEUE POSITION: ${handler.accessState(robotId, 'handQueue').length}\n`);
				}

				const sizeOfQueue = handler.accessState(robotId, 'handQueue').length;
				handler.sendToAllClients(robotId, `HAND QUEUE UPDATE: ${sizeOfQueue}\n`, true);

			} else handler.sendToClient(clientId, `HAND QUEUE POSITION: ${position}\n`);
		}

	} else if (msg === 'HAND BACK') {
		if (handler.accessState(robotId, 'handHolder')!==clientId) return;
		clearTimeout(handler.accessState(robotId, 'handTimer'));
		if (handler.accessState(robotId, 'handQueue').length===0) {
			handler.accessState(robotId, 'handHolder', null);
		} else {
			handler.accessState(robotId, 'handHolder', handler.accessState(robotId, 'handQueue')[0]);
			handler.accessState(robotId, 'handQueue').shift();
			handler.sendToClient(handler.accessState(robotId, 'handHolder'), 'HAND REQUEST ACCEPTED\n');
			handler.setHandTimeout(handler.accessState(robotId, 'handHolder'));
			handler.updatePositions(robotId);
		}
		handler.sendToClient(clientId, 'HAND TIMEOUT\n');

 	} else if (msg === 'DATA') {
		sendData(clientId);

	} else if (msg.startsWith('CODE ADMIN: ')) {
		const code = msg.substring('CODE ADMIN: '.length);
		if (code===handler.accessCodeAdmin()) {
			handler.adminClients.add(clientId);
			handler.sendToClient(clientId, 'ADMIN REQUEST ACCEPTED\n');
			if (handler.accessState(robotId) && handler.accessState(robotId, 'handQueue').indexOf(clientId)!==-1) {
				handler.accessState(robotId, 'handQueue', handler.accessState(robotId, 'handQueue').filter((id) => id !== clientId));
				receiveRequest(clientId, 'HAND');
			}
		} else {
			handler.sendToClient(clientId, 'ADMIN REQUEST REJECTED\n');
		}

	} else if (msg === 'QUIT ADMIN') {
		if (!handler.adminClients.has(clientId)) return;

		if (handler.accessState(robotId) && handler.accessState(robotId, 'handQueue').indexOf(clientId)!==-1) {
			handler.accessState(robotId, 'handQueue', handler.accessState(robotId, 'handQueue').filter((id) => id !== clientId));
			receiveRequest(clientId, 'HAND');
		}

		handler.adminClients.delete(clientId);
		handler.sendToClient(clientId, 'ADMIN REQUEST REJECTED\n');

	} else if (msg === 'GET HAND LIST') {
		const handList = handler.accessState(robotId, 'handQueue');
		var resultStr = '';
		if (handler.accessState(robotId, 'handHolder')) {
			resultStr += `0: ${handler.accessState(robotId, 'handHolder')} `;
			if (handler.adminClients.has(handler.accessState(robotId, 'handHolder'))) {
				resultStr += `(admin) `;
			}
			const rawTime = Math.floor((handler.accessState(robotId, 'handTimeout') - Date.now() + handler.accessState(robotId, 'handTimerStartTime'))/1000);
			const minutes = Math.floor(rawTime/60);
			var seconds = rawTime%60;
			if (seconds<10) {
				seconds = '0'+seconds;
			}

			resultStr += `(Hand holder) time remaining : ${minutes}:${seconds},`;
		}
		for (let i=0; i<handList.length; i++) {
			if (handler.adminClients.has(handList[i])) {
				resultStr += `${i+1}: ${handList[i]} (admin),`;
			} else resultStr += `${i+1}: ${handList[i]},`;
		}
		handler.sendToClient(clientId, `HAND LIST: ${resultStr}\n`);

	} else if (msg.startsWith('REMOVE FROM HAND LIST: ')) {
		const index = parseInt(msg.substring('REMOVE FROM HAND LIST: '.length));
		if (index<0 || index>handler.accessState(robotId, 'handQueue').length) return;

		if (index===0) {
			receiveRequest(handler.accessState(robotId, 'handHolder'), 'HAND BACK');
		} else {
			handler.sendToClient(handler.accessState(robotId, 'handQueue')[index-1], 'HAND TIMEOUT\n');
			handler.accessState(robotId, 'handQueue').splice(index-1, 1);
			handler.updatePositions(robotId);
		}

	} else if (msg.startsWith('ROBOTID ADDED: ')) {
		const robotId = msg.substring('ROBOTID ADDED: '.length);
		handler.sendStatus(robotId, clientId);
		updateClientQueue(clientId, robotId);
		sendData(clientId, robotId);

	} else if (msg.startsWith('CHANGE ROBOTID: ')) {
		const newRobotId = msg.substring('CHANGE ROBOTID: '.length);
		if (!handler.accessState(newRobotId)) return;
		removeClientFromQueue(clientId, handler.connectedClients.get(clientId).get('robotId'));
		handler.connectedClients.get(clientId).set('robotId', newRobotId);
		handler.sendToClient(clientId, 'SELECTED ROBOTID', newRobotId);
	}
}



async function sendData(clientId, robotIdOverwrite) {
	var robotId;
	if (robotIdOverwrite) robotId=robotIdOverwrite;
	else robotId = handler.connectedClients.get(clientId).get('robotId');

	const data = new Map();
	data.set('id', new Map());

	var id=0;
	await handler.accessDB().collection(`labels_${robotId}`).find().forEach(doc => {
		data.get('id').set(doc.label, id)
		id++;
	});

	for (let collection of ['fails', 'successes', 'times']) {
		data.set(collection, new Array(id));
		await handler.accessDB().collection(`${collection}_${robotId}`).find().forEach(doc => {
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

	var robotLocation;
	if (handler.accessStatus(robotId, 'Location')) {
		robotLocation = handler.accessStatus(robotId, 'Location').substring('Location: '.length).trim();
	} else robotLocation = '0 0 0';

	const flagAutoParking = handler.accessState(robotId, 'flagAutoParking');

	handler.sendToClient(
		clientId,
		`DATA: ${jsonString}FLAG_SPLIT${handler.accessState(robotId, 'robotCurPos')}FLAG_SPLIT${robotLocation}FLAG_SPLIT${flagAutoParking}\n`,
		robotId
	);

	// when robotIdOverwrite is used, the clients already knows the robotIds
	if (robotIdOverwrite) return;

	const robotIds = handler.getRobotIds();
	for (let id of robotIds) {
		handler.sendToClient(clientId, `ADD ROBOTID\n`, id);
	}
}
