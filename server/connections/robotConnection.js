

var handler = require('./handler');

module.exports = { connectToRobot, receiveResponseRobot }

const net = require('net');

var statusTimer = null;
const statusInterval = 1 * 1000;
const port_robot = 3456;
const robot_host = 'localhost';
const robotPassword = 'password';



const hexData = "";
const binaryData = Buffer.from(hexData, 'hex');
function sendBinary() {
	setTimeout(()=> {
		handler.accessState('robotSocket').write(binaryData);
	}, 5*1000);
}


function connectToRobot() {
	handler.accessState('robotSocket', net.createConnection({ host: robot_host, port: port_robot }, () => {
		console.log(`Connected to the robot on port ${port_robot}`);
		handler.accessState('robotConnected', true);
		handler.sendToRobot(robotPassword);
		//handler.sendToRobot('status');
		//sendBinary();


		// Handle incoming data from the robot
		handler.accessState('robotSocket').on('data', (data) => {
			for (let e of data.toString().split('\n')) {
				if (!e) continue;
				receiveResponseRobot(`${e}\n`);
			}
		});

		// Handle the end of the robot connection
		handler.accessState('robotSocket').on('end', () => {
			console.log('WARNING : Robot disconnected');
			handler.accessState('robotConnected', false);

			// Attempt to reconnect to the robot after a delay
			setTimeout(connectToRobot, 5000); // 5 seconds
		});

		// Handle errors in the robot connection
		handler.accessState('robotSocket').on('error', (err) => {
			console.error('Socket error:', err);
			handler.accessState('robotConnected', false);

			// Attempt to reconnect to the robot after a delay
			setTimeout(connectToRobot, 5000); // 5 seconds
		});
	}));

	// If the connection to the robot fails, retry after a delay
	handler.accessState('robotSocket').on('error', (err) => {
	  if (err.code === 'ECONNREFUSED') {
		console.log('WARNING : Robot is not available, retrying in 5 seconds...');
		setTimeout(connectToRobot, 5000); // 5 seconds
	  } else {
		console.error('Socket error:', err);
	  }
	});
}




async function receiveResponseRobot(response) { // from the robot
	console.log(`Received from robot : ${response}`);

	if (response.startsWith('ExtendedStatusForHumans: ') || response.startsWith('Status: ') || response.startsWith('Location: ') ||
			response.startsWith('StateOfCharge: ') || response.startsWith('LocalizationScore: ') || response.startsWith('Temperature: ')) {
		handler.sendToAllClients(response);

		// update the current location of the robot
		if (response.startsWith('Location: ')) {
			handler.accessState('curLocationRobot', response);
		}
		return;
	}


	// a response is received, the timer is reset
	if (handler.accessState('handHolder')) {
		handler.setHandTimeout(handler.accessState('handHolder')); // warning : problem if the robot bugs and sends 'Parking' every milliseconds (it happens sometimes)
	}

	// send the response
	handler.sendToAllClients(`RESPONSE: ${response}`);

	if (handler.accessState('requestDict') && (response.startsWith('Interrupted: ') || response.startsWith('Error: Failed going to goal'))) {
		// request failed or interrupted by an other request or by an EStop
		handler.accessState('interruptedRequest', handler.accessState('requestDict'));
		handler.accessState('requestDict', null);
	}

	if (response.startsWith('EStop')||response.startsWith('Error: Failed going to goal')) { // fail
		clearInterval(statusTimer);
		handler.sendToRobot('status');

		if (!handler.accessState('interruptedRequest')) {
			if (!handler.accessState('requestDict')) {
				console.log('Error: no request to be classify as a fail')
				return;
			}
			handler.accessState('interruptedRequest', handler.accessState('requestDict'));
			handler.accessState('requestDict', null);
		}
		const src = handler.accessState('curPosRobot');
		const dest = handler.accessState('interruptedRequest').dest;

		handler.accessState('database').collection('fails').findOne({label: src}).then(doc => {
			doc.fails[dest]++;
			handler.accessState('database').collection('fails').updateOne(
				{_id: doc._id},
				{$set: {fails: doc.fails}}
			);
		});

		response_update = JSON.stringify({src: src, dest:dest, time: -1});
		handler.sendToAllClients(`UPDATE VARIABLES: ${response_update}\n`);
	}




  if (response.startsWith('Arrived at ')||response.startsWith('Parked')||response.startsWith('DockingState: Docked')) {
		clearInterval(statusTimer);
		handler.sendToRobot('status');
		handler.accessState('interruptedRequest', null);


		var response_dest = response.substring('Arrived at '.length).toLowerCase().trim();

		if (response.startsWith('Parked')) {
			response_dest = 'standby1';
		} else if (response.startsWith('DockingState: Docked')) {
			response_dest = 'dockingstation2';
		}

		if (!handler.accessState('requestDict')||response_dest!==handler.accessState('requestDict').dest) {
			handler.accessState('curPosRobot', response_dest);
			// update the requestDict
			handler.accessState('requestDict', null);
			return
		}

		var response_update;
		const src=handler.accessState('curPosRobot');
		const dest=handler.accessState('requestDict').dest;
		// update the current position of the robot
		handler.accessState('curPosRobot', dest);

		const new_time = (Date.now()-handler.accessState('requestDict').time)/1000;
		console.log('NEW TIME: ', new_time);


		var flagError=false;
		for (let label of [src, dest]) {
			await handler.accessState('database').collection('labels').findOne({label: label}).then(doc => {
				if (!doc) {
					flagError=true;
					console.log(`Could not find ${label} in the database`);
				}
			})
			.catch(error => {
				console.log(error);
				flagError=true;
				console.log(`Could not find ${label} in the database`);
			});
		}

		if  (flagError) return;



		handler.accessState('database').collection('times').findOne({label: src}).then(doc => {
			doc.times[dest]=new_time;
			handler.accessState('database').collection('times').updateOne(
				{_id: doc._id},
				{$set: {times: doc.times}}
			);
		});

		handler.accessState('database').collection('successes').findOne({label: src}).then(doc => {
			doc.successes[dest]++;
			handler.accessState('database').collection('successes').updateOne(
				{_id: doc._id},
				{$set: {successes: doc.successes}}
			);
		});

		response_update = JSON.stringify({src: src, dest: dest, time: new_time});

		/*
		// update the data (matrix of times and successes)
		data.times[cur_id][next_id] = (data.times[cur_id][next_id]*data.successes[cur_id][next_id] + new_time) / (data.successes[cur_id][next_id] + 1);
		data.successes[cur_id][next_id] +=1;

		// round to 2 decimals
		data.times[cur_id][next_id] = Math.round(data.times[cur_id][next_id]*100)/100;

		response_update = JSON.stringify({src: cur_id, dest: next_id, time: data.times[cur_id][next_id]});

		*/

		// remove the request
		handler.accessState('requestDict', null);

		// send the updates to everyone (time + success)
		handler.sendToAllClients(`UPDATE VARIABLES: ${response_update}\n`)

  } else if ((response.startsWith('Going to ')||response.startsWith('Parking')||response.startsWith('DockingState: Docking'))) {
		clearInterval(statusTimer);
		handler.sendToRobot('status');
		statusTimer = setInterval(() => {
			handler.sendToRobot('status');
		}, statusInterval);

		var dest;
		// TODO : donner les bonnes valeurs de dest pour park et dock
		if (response.startsWith('Going to ')) {
			dest=response.substring('Going to '.length).trim().toLowerCase();
		} else if (response.startsWith('Parking')) {
			dest='standby1';
		} else if (response.startsWith('DockingState: Docking')) {
			dest='dockingstation2';
		}

		if (!handler.accessState('interruptedRequest')) {
			handler.accessState('requestDict', {time: Date.now(), dest: dest});
		}
	}
}
