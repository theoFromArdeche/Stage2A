


const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const compression = require('compression');

const app = express();
const port_map = 3001;


const port_server = 2345;

const connectedClients = new Map(); // map to keep track of connected clients
var handQueue = []; // array to keep track of the request queue
var handHolder = null; // variable to keep track of the hand holder
var handTimer = null;
var flagStatus = false;	
var statusTimer = null;
const statusInterval = 1 * 1000;
const handTimeout = 10 * 1000; // hand timeout in milliseconds (10 seconds)
const pingTiming = 60 * 1000 // 60 seconds


const requestsQueue = [];

var curPosRobot = 'dockingstation2';
var curLocationRobot = 'Location: -384 1125 0'


const net = require('net');
const port_robot = 3456;
const robot_host = 'localhost';
var robotConnected = false; 
var robotSocket = null;
const robotPassword = "password"







// MAKE THE MAP AVAILABLE FOR THE CLIENTS

app.use(cors());
app.use(compression());


app.get('/map', (req, res) => {
  const filePath = path.join(__dirname, 'map_loria.txt');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return res.status(500).send('File not found or cannot be read');
    }

    res.send(data);
  });
});

app.listen(port_map, () => {
  console.log(`File server is running on http://localhost:${port_map}`);
});







// FETCH THE DATA

const jsonString = fs.readFileSync('./data.json', 'utf8').toLowerCase();

// Parse the JSON string
var data;
try {
  data = JSON.parse(jsonString);
} catch (err) {
  console.log('Error parsing JSON:', err);
}


data.id = new Map(Object.entries(data.id)); 

//console.log(data)












// CONNECT TO THE ROBOT

function connectToRobot() {
	robotSocket = net.createConnection({ host:robot_host, port: port_robot }, () => {
		console.log(`Connected to the robot on port ${port_robot}`);
		robotConnected = true;
		robotSocket.write(robotPassword)
	
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



function receiveResponseRobot(response) { // from the robot
	console.log('Received from robot : ' + response)

	// a response is received, the timer is reset
  setHandTimeout(handHolder); // warning : problem if the robot bugs and sends 'Parking' every milliseconds (it happens sometimes)

	if (response.startsWith('ExtendedStatusForHumans: ')) {
		sendToEveryone(response)

		// update the current location of the robot
		const response_arr = response.split('\n');
		curLocationRobot = response_arr[3];
		return;
	} 


  // send the response to the client that made the request
	sendRequest(handHolder, 'RESPONSE: '+response);

  if (response.startsWith('Arrived at ')) {
		clearInterval(statusTimer);
		sendRequestRobot('status\n');
		flagStatus=false;

		var response_update;
		const cur_id=data.id.get(curPosRobot);
		const next_id=data.id.get(requestsQueue[0].dest);
		// update the current position of the robot
		curPosRobot = requestsQueue[0].dest;
		
		const new_time = (Date.now()-requestsQueue[0].time)/1000;
		console.log('NEW TIME: ', new_time)
		
		// update the data (matrix of times and successes)
		data.times[cur_id][next_id] = (data.times[cur_id][next_id]*data.successes[cur_id][next_id] + new_time) / (data.successes[cur_id][next_id] + 1);
		data.successes[cur_id][next_id] +=1;

		// round to 2 decimals
		data.times[cur_id][next_id] = Math.round(data.times[cur_id][next_id]*100)/100;

		response_update = JSON.stringify({src: cur_id, dest: next_id, time: data.times[cur_id][next_id]});
		
		//console.log(data)
		// pop the request
		requestsQueue.shift();
		
		// send the updates to everyone (time + success)
		sendToEveryone('UPDATE VARIABLES: '+response_update+'\n')

  } else if (response.startsWith('Going to ')&&!flagStatus) { // &&!flagStatus to prevent issues when sending multiples goto
		flagStatus=true;
		sendRequestRobot('status\n');
		statusTimer = setInterval(() => {
			sendRequestRobot('status\n');
		}, statusInterval);
	}// else if () { // fail
	// update the current position of the robot
	// TODO curPosRobot = ???

	// data.fails[cur_id][next_id] +=1;
	// response_update = JSON.stringify({src: cur_id, dest: next_id, time: -1});;
	//}


  
}


function sendRequestRobot(request) {
  new Promise((resolve, reject) => {
    // wait for the robot to be connected
    const checkConnection = () => {
      if (robotConnected) {
        console.log('Send to robot : |' + request+'|');
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






















// CONNECT TO THE CLIENTS

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
		const msg = data.toString();
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
	handQueue = handQueue.filter((id) => id !== clientId);
	// if the client was the hand holder, set a new owner
	if (handHolder === clientId) {
		clearTimeout(handTimer);
		if (handQueue.length===0) {
			handHolder=null;
		} else {
			handHolder = handQueue[0];
			handQueue.shift();
			sendRequest(handHolder, 'HAND REQUEST ACCEPTED\n');
			setHandTimeout(handHolder);
		}
	}
	
	// update the clients
	updatePositions();
}

function updateClientQueue(clientId) {
	sendRequest(clientId, `HAND QUEUE UPDATE: ${handQueue.length}\n`)
}


function sendRequest(clientId, msg) {
	console.log(`Send to client ${clientId}: ${msg}`);
	// get the socket for the client from the connected clients map
	const socket = connectedClients.get(clientId);
	if (socket) socket.write(msg);
	
}

function receiveRequest(clientId, msg) {
	// a request is received, the timer is reset
  setHandTimeout(handHolder);

	console.log(`Received from client ${clientId}: ${msg}`);
	if (msg === 'PING\n') {
		return;
	} else if (msg.startsWith('REQUEST: ')) {

		if (handHolder != clientId) return;

		const request = msg.substring('REQUEST: '.length).toLowerCase();
		if (!request.startsWith('goto ')&&request!=='dock\n') {
			//console.log('invalid command\n');
			sendRequestRobot(request)
			return;
		}

		var dest;
		if (request === 'dock\n') {
			dest = 'dockingstation2';
		} else {
			dest = request.substring('goto '.length);
		}
		if (!data.id.has(dest)) {
			//console.log('invalid destination\n');
			sendRequest(clientId, 'RESPONSE: Unknown destination '+ dest +'\n'); // TEMPORAIRE
			return;
		}

		requestsQueue.push({time: Date.now(), dest: dest});

		// send the request to the robot
		sendRequestRobot(request)

		// the timeout will be rest when the response is received
		clearTimeout(handTimer);

	} else if (msg === 'HAND\n') {
		if (!handHolder) {
			// the hand is available and given to the client
			handHolder=clientId;
			sendRequest(clientId, 'HAND REQUEST ACCEPTED\n');
			setHandTimeout(clientId);
		} else {
			if (handHolder==clientId) {
				sendRequest(clientId, 'YOU ALREADY HAVE THE HAND\n');
				return;
			}
			// the hand is not available
			position = handQueue.indexOf(clientId) + 1;
			if (position==0) { // clientId not in the queue
				handQueue.push(clientId);
				position=handQueue.length
				sendToEveryone(`HAND QUEUE UPDATE: ${position}\n`);
			}
			sendRequest(clientId, `HAND QUEUE POSITION: ${position}\n`);
		}
	} else if (msg === 'DATA\n') {
		const jsonString = JSON.stringify(data, (key, value) => {
			// If the value is a Map, convert it to an object
			if (value instanceof Map) {
				return Object.fromEntries(value.entries());
			}
			// Otherwise, return the value as is
			return value;
		});
		sendRequest(clientId, 'DATA: '+jsonString+'FLAG_SPLIT'+curPosRobot+'\n'+curLocationRobot+'\n');
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
	clearTimeout(handTimer);
	handTimer = setTimeout(() => {
		if (handQueue.length===0) { // queue is empty
			handHolder=null;
		} else { // set the first client in the queue as the hand holder
			handHolder = handQueue[0];
			handQueue.shift();
			sendRequest(handHolder, 'HAND REQUEST ACCEPTED\n');
			setHandTimeout(handHolder);
			updatePositions();
		}
		sendRequest(clientId, 'HAND TIMEOUT\n');
	}, handTimeout);
}


function updatePositions() {
	// notify each client in the queue of their new position
	for (let i=0; i<handQueue.length; i++) {
		sendRequest(handQueue[i], `HAND QUEUE POSITION: ${i+1}\n`);
	}
	// notify everyone of the new size of the queue
	sendToEveryone(`HAND QUEUE UPDATE: ${handQueue.length}\n`);
}
