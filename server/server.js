

const net = require('net');
const port_server = 2345;

connectedClients = new Map(); // map to keep track of connected clients
requestQueue = []; // array to keep track of the request queue
handHolder = null; // variable to keep track of the hand holder
handTimer = null;
const handTimeout = 10*1000; // hand timeout in milliseconds (10 seconds)
const pingTiming = 60*1000 // 60 seconds

const server = net.createServer((socket) => {
	console.log('Client connected');
	console.log('Client socket info:', socket.address());

	// create a unique identifier for the client
	const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
	console.log(`Client connected with id: ${clientId}`);

	// add the socket to the connected clients map
	connectedClients.set(clientId, socket);

	// send a ping to the client every 5 seconds to check if it's still there
	const pingInterval = setInterval(() => {
		socket.write('PING\n');
	}, pingTiming);

	// received data from the client
	socket.on('data', (data) => {
		const msg = data.toString().trim();
		receiveRequest(clientId, msg);
	});

	socket.on('end', () => {
		console.log('Client disconnected');
		console.log('Client socket info:', socket.address());
		// remove the socket from the connected clients map
		connectedClients.delete(clientId);
		// stop the ping interval
		clearInterval(pingInterval);
		// remove the client from the request queue
		requestQueue = requestQueue.filter((req) => req.clientId !== clientId);
		// if the client was the hand holder, set the hand holder to null
		if (handHolder === clientId) {
			clearTimeout(handTimer);
			if (requestQueue.length===0) {
				handHolder=null;
			} else {
				handHolder = requestQueue[0];
				requestQueue.shift();
				sendRequest(handHolder, 'hand request accepted\n');
				setHandTimeout(handHolder);
			}
		}
	});

	// Event handler for errors
	socket.on('error', (err) => {
		console.error('Socket error:', err);
		// remove the socket from the connected clients map
		connectedClients.delete(clientId);
		// stop the ping interval
		clearInterval(pingInterval);
		// remove the client from the request queue
		requestQueue = requestQueue.filter((req) => req.clientId !== clientId);
		// if the client was the hand holder, set the hand holder to null
		if (handHolder === clientId) {
			clearTimeout(handTimer);
			if (requestQueue.length===0) {
				handHolder=null;
			} else {
				handHolder = requestQueue[0];
				requestQueue.shift();
				sendRequest(handHolder, 'hand request accepted\n');
				setHandTimeout(handHolder);
			}
		}
	});
});

server.listen(port_server, () => {
  console.log(`Telnet server listening on port ${port_server}`);
});

let data = {
	// matrix of times
	times: [
		//...
	],
	// matrix of successes
	successes: [
		//...
	],
};

function sendRequest(clientId, msg) {
	console.log(`Send to client ${clientId}: ${msg}`);
	// get the socket for the client from the connected clients map
	const socket = connectedClients.get(clientId);
	if (socket) {
		socket.write(msg);
	}
}

function receiveRequest(clientId, msg) {
	console.log(`Received from client ${clientId}: ${msg}`);
	if (msg === 'PING') {
		return;
	} else if (msg.startsWith('REQUEST: ')) {

		if (handHolder != clientId) return;

		const request = msg.substring('REQUEST: '.length);

		// send the request to the robot (simulated for now)
		const response_test = "(response test)";
		const response = `UPDATE: ${response_test} - ${Date.now()}\n`;
		// update the data (matrix of times and successes)

		
		// send the response to the client that made the request
		sendRequest(clientId, "RESPONSE: test\n");


		// send the updates to everyone (time + success)
		sendToEveryone(response)

		// set a timeout to release the hand
		if (handTimer) clearTimeout(handTimer);
		setHandTimeout(clientId);

	} else if (msg === "HAND") {
		if (!handHolder) {
			// the hand is available and given to the client
			handHolder=clientId;
			sendRequest(clientId, 'hand request accepted\n');
			setHandTimeout(clientId);
		} else {
			if (handHolder==clientId) {
				sendRequest(clientId, "you already have the hand\n");
				return;
			}
			// the hand is not available
			position = requestQueue.indexOf(clientId) + 1;
			if (position==0) {
				requestQueue.push(clientId);
				position=requestQueue.length
			}
			sendRequest(clientId, `hand queue position: ${position}\n`);
		}
	}
}

function sendToEveryone(msg) {
	console.log(`Send to everyone : ${msg}`)
	// iterate over the connectedClients map
	for (let [clientId, socket] of connectedClients.entries()) {
		// send the message to the client
		socket.write(msg);
	}
}



function setHandTimeout(clientId) {
	handTimer = setTimeout(() => {
		if (requestQueue.length===0) {
			handHolder=null;
		} else {
			handHolder = requestQueue[0];
			requestQueue.shift();
			sendRequest(handHolder, 'hand request accepted\n');
			setHandTimeout(handHolder);
		}
		sendRequest(clientId, 'hand timeout\n');
	}, handTimeout);
}