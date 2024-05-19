
const net = require('net');
const port_robot = 3456;
const robot_host = '192.168.206.124';
var robotConnected = false; 
var robotSocket = null;

function connectToRobot() {
	robotSocket = net.createConnection({ host:robot_host, port: port_robot }, () => {
		console.log(`Connected to the robot on port ${port_robot}`);
		robotConnected = true;
	
		// Handle incoming data from the robot
		robotSocket.on('data', (data) => {
			receiveResponseRobot(data.toString());
		});
	
		// Handle the end of the robot connection
		robotSocket.on('end', () => {
			console.log('WARNING : Robot disconnected');
			robotConnected = false;
	
			// Attempt to reconnect to the robot after a delay
			setTimeout(connectToRobot, 5000); // 5 seconds
		});
	
		// Handle errors in the robot connection
		robotSocket.on('error', (err) => {
			console.error('Socket error:', err);
			robotConnected = false;
	
			// Attempt to reconnect to the robot after a delay
			setTimeout(connectToRobot, 5000); // 5 seconds
		});
	});
  
	// If the connection to the robot fails, retry after a delay
	robotSocket.on('error', (err) => {
	  if (err.code === 'ECONNREFUSED') {
		console.log('WARNING : Robot is not available, retrying in 5 seconds...');
		setTimeout(connectToRobot, 5000); // 5 seconds
	  } else {
		console.error('Socket error:', err);
	  }
	});
}
  
connectToRobot();



function receiveResponseRobot(response) { // from the server
  console.log("Received from robot : " + response)
  
  // send the response to the client that made the request
  sendRequest(handHolder, "RESPONSE: "+response+"\n");

  const response_update = `UPDATE: ${response} - ${Date.now()}\n`;
  // update the data (matrix of times and successes)

  // send the updates to everyone (time + success)
  sendToEveryone(response_update)

  // a response is received, the timer is reset
  setHandTimeout(handHolder);
}


function sendRequestRobot(request) {
  new Promise((resolve, reject) => {
    // wait for the robot to be connected
    const checkConnection = () => {
      if (robotConnected) {
        console.log("Send to robot : " + request);
        robotSocket.write(request, (err) => {
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



function socketDisconnect(clientId, pingInterval) {
	// remove the socket from the connected clients map
	connectedClients.delete(clientId);
	// stop the ping interval
	clearInterval(pingInterval);
	// remove the client from the request queue
	requestQueue = requestQueue.filter((req) => req.clientId !== clientId);
	// if the client was the hand holder, set a new owner
	if (handHolder === clientId) {
		clearTimeout(handTimer);
		if (requestQueue.length===0) {
			handHolder=null;
		} else {
			handHolder = requestQueue[0];
			requestQueue.shift();
			sendRequest(handHolder, 'hand request accepted\n');
			setHandTimeout(handHolder);
			updatePositions();
		}
	}
}


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
	if (socket) socket.write(msg);
	
}

function receiveRequest(clientId, msg) {
	console.log(`Received from client ${clientId}: ${msg}`);
	if (msg === 'PING') {
		return;
	} else if (msg.startsWith('REQUEST: ')) {

		if (handHolder != clientId) return;

		const request = msg.substring('REQUEST: '.length);

		// send the request to the robot
		sendRequestRobot(request)

		// the timeout will be rest when the response is received
		clearTimeout(handTimer);

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
			if (position==0) { // clientId not in the queue
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
		if (requestQueue.length===0) { // queue is empty
			handHolder=null;
		} else { // set the first client in the queue as the hand holder
			handHolder = requestQueue[0];
			requestQueue.shift();
			sendRequest(handHolder, 'hand request accepted\n');
			setHandTimeout(handHolder);
			updatePositions();
		}
		sendRequest(clientId, 'hand timeout\n');
	}, handTimeout);
}


function updatePositions() {
	// notify each client in the queue of their new position
	for (let i=0; i<requestQueue.length; i++) {
		sendRequest(requestQueue[i], `hand queue position: ${i+1}\n`);
	}
}