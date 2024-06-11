

module.exports = { connectToRobot, receiveResponseRobot }

var {
	sendToRobot, sendToClient, sendToAllClients, setHandTimeout,
	robotSocket, robotConnected, handHolder, curPosRobot, curLocationRobot, database
} = require('./handler');


const net = require('net');

var flagStatus = false;
var statusTimer = null;
const statusInterval = 1 * 1000;
var requestDict = null;
const port_robot = 3456;
const robot_host = 'localhost';
const robotPassword = 'password';



function connectToRobot() {
	robotSocket = net.createConnection({ host:robot_host, port: port_robot }, () => {
		console.log(`Connected to the robot on port ${port_robot}`);
		robotConnected = true;
		sendToRobot(robotPassword)

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




function receiveResponseRobot(response) { // from the robot
	console.log(`Received from robot : ${response}`)

	if (response.startsWith('ExtendedStatusForHumans: ')||response.startsWith('Status: ')) {
		sendToAllClients(response)

		// update the current location of the robot
		const response_arr = response.split('\n');
		for (let i=0; i<response_arr.length; i++) {
			if (!response_arr[i].startsWith('Location: ')) continue
			curLocationRobot = response_arr[i];
			break;
		}
		return;
	}


	// a response is received, the timer is reset
	if (handHolder) {
		setHandTimeout(handHolder); // warning : problem if the robot bugs and sends 'Parking' every milliseconds (it happens sometimes)

		// send the response to the client that made the request
		const response_arr = response.split('\n');
		for (let i=0; i<response_arr.length; i++) {
			if (!response_arr[i]) continue
			sendToClient(handHolder, `RESPONSE: ${response_arr[i]}\n`);
		}
	}


	if (response.startsWith('Interrupted')) {
		requestDict=null;
	}

	if (response.startsWith('EStop')) {
		//if (requestDict) {

		//}
		requestDict=null;
	}


	// if the robot is not moving anymore, stop the status requests
	if (response.startsWith('Arrived at ')||response.startsWith('Parked')||response.startsWith('DockingState: Docked')) {
		clearInterval(statusTimer);
		sendToRobot('status');
		flagStatus=false;
	}


  if (response.startsWith('Arrived at ')) {
		const response_dest = response.substring('Arrived at '.length).toLowerCase();
		if (!requestDict||response_dest!==requestDict.dest) {
			curPosRobot = response_dest;
			// update the requestDict
			requestDict=null;
			return
		}

		var response_update;
		const cur_id=data.id.get(curPosRobot);
		const next_id=data.id.get(requestDict.dest);
		// update the current position of the robot
		curPosRobot = requestDict.dest;

		const new_time = (Date.now()-requestDict.time)/1000;
		console.log('NEW TIME: ', new_time)

		// update the data (matrix of times and successes)
		data.times[cur_id][next_id] = (data.times[cur_id][next_id]*data.successes[cur_id][next_id] + new_time) / (data.successes[cur_id][next_id] + 1);
		data.successes[cur_id][next_id] +=1;

		// round to 2 decimals
		data.times[cur_id][next_id] = Math.round(data.times[cur_id][next_id]*100)/100;

		response_update = JSON.stringify({src: cur_id, dest: next_id, time: data.times[cur_id][next_id]});

		//console.log(data)
		// pop the request
		requestDict = null;

		// send the updates to everyone (time + success)
		sendToAllClients(`UPDATE VARIABLES: ${response_update}\n`)

  } else if ((response.startsWith('Going to ')||response.startsWith('Parking')||response.startsWith('DockingState: Docking'))&&!flagStatus) { // &&!flagStatus to prevent issues when sending multiples goto
		clearInterval(statusTimer);
		flagStatus=true;
		sendToRobot('status');
		statusTimer = setInterval(() => {
			sendToRobot('status');
		}, statusInterval);
	}// else if () { // fail
	// update the current position of the robot
	// TODO curPosRobot = ???

	// data.fails[cur_id][next_id] +=1;
	// response_update = JSON.stringify({src: cur_id, dest: next_id, time: -1});;
	//}
}
