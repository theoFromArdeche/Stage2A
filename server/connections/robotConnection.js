

var handler = require('./handler');

module.exports = { connectToRobot }

const net = require('net');


const hexData = "";
const binaryData = Buffer.from(hexData, 'hex');
function sendBinary(robotId) {
	setTimeout(()=> {
		handler.accessState(robotId, 'robotSocket').write(binaryData);
	}, 5*1000);
}


function connectToRobot(host, port, password) {
	const robotId = handler.createRobot(host, port);

	handler.accessState(robotId, 'robotSocket', net.createConnection({ host: host, port: port }, async () => {
		console.log(`(${robotId}) Connected to the robot on port ${port}`);
		await handler.initializeRobotSettings(robotId);
		handler.accessState(robotId, 'robotConnected', true);
		handler.sendToRobot(robotId, password);
		handler.initializeClients(robotId);
		//sendBinary(robotId);

		// notify the clients that this robot is available
		handler.sendToAllClients(robotId, `ADD ROBOTID\n`, true);
		handler.sendToRobot(robotId, 'status');
	}));

	handler.accessState(robotId, 'robotSocket').on('data', (data) => {
		for (let e of data.toString().split('\n')) {
			if (!e) continue;
			receiveResponseRobot(`${e}\n`, robotId);
		}
	});

	handler.accessState(robotId, 'robotSocket').on('end', () => {
		console.log(`(${robotId}) WARNING : Robot disconnected`);
		handler.sendToAllClients(robotId, `REMOVE ROBOTID\n`, true);
		handler.deleteRobot(robotId);

		// Attempt to reconnect to the robot after a delay
		setTimeout(() => {
			connectToRobot(host, port, password);
		}, 5000); // 5 seconds
	});

	handler.accessState(robotId, 'robotSocket').on('error', (err) => {
		console.error(`(${robotId}) Could not connect to the robot`);
		handler.deleteRobot(robotId, false);

		// Attempt to reconnect to the robot after a delay
		setTimeout(() => {
			connectToRobot(host, port, password);
		}, 5000); // 5 seconds
	});
}



function initializeRobotPos(robotId, location) {
	const coordsMap = handler.accessInterrestPointsCoords(robotId);
	const curLoc = location.split(' ').map(item => parseInt(item));
	var curDist = -1, curId;
	for (let [id, coords] of coordsMap.entries()) {
		if (curDist !== -1 && Math.abs(coords[0]-curLoc[0])+Math.abs(coords[1]-curLoc[1])>=curDist) continue;
		curDist = Math.abs(coords[0]-curLoc[0])+Math.abs(coords[1]-curLoc[1]);
		curId = id;
	}

	handler.accessState(robotId, 'robotCurPos', curId);
	console.log(`\n(${robotId}) Calculated position : ${curId} with a distance of ${curDist}\n`);
}



async function receiveResponseRobot(response, robotId) { // from the robot

	if (response.startsWith('ExtendedStatusForHumans: ') || response.startsWith('Status: ') || response.startsWith('Location: ') ||
			response.startsWith('StateOfCharge: ') || response.startsWith('LocalizationScore: ') || response.startsWith('Temperature: ')) {

		if (handler.accessState(robotId, 'showStatusInTerminal')) {
			console.log(`(${robotId}) Received from robot : ${response}`);
		}

		handler.sendToAllClients(robotId, response, true, handler.accessState(robotId, 'showStatusInTerminal'));
		handler.accessStatus(robotId, response.split(':')[0], response);

		if (response.startsWith('Location: ')) {
			if (handler.accessState(robotId, 'robotCurPos') === 'unknown') {
				initializeRobotPos(robotId, response.substring('Location: '.length));
			}
		} else if (handler.accessState(robotId, 'flagDockPark') && response.startsWith('ExtendedStatusForHumans: ')) {
			const status = response.substring('ExtendedStatusForHumans: '.length);
			for (let s of status.split('|')) {
				if (s.startsWith('Going to dock at ')) {
					handler.accessState(robotId, 'destDockPark', s.substring('Going to dock at '.length).trim().toLowerCase());
				} else if (s.startsWith('Driving into dock')) {
					if (handler.accessState(robotId, 'requestDict')) {
						handler.accessState(robotId, 'requestDict').dest = handler.accessState(robotId, 'destDockPark');
						await updateDB(handler.accessState(robotId, 'destDockPark'), robotId);
					}
					const dockNumber = handler.accessState(robotId, 'destDockPark') .substring('Station LD/Lynx'.length);
					handler.accessState(robotId, 'requestDict', {time: Date.now(), dest:  `dockingstation${dockNumber}`});
					handler.accessState(robotId, 'destDockPark', `dockingstation${dockNumber}`);
					handler.accessState(robotId, 'flagDockPark', false);

				} else if (s.startsWith('Going to ')) {
					handler.accessState(robotId, 'destDockPark', s.substring('Going to '.length).trim().toLowerCase());
				}
			}
		}
		return;
	}

	console.log(`(${robotId}) Received from robot : ${response}`);


	// a response is received, the timer is reset
	if (handler.accessState(robotId, 'handHolder')) {
		handler.setHandTimeout(handler.accessState(robotId, 'handHolder')); // warning : problem if the robot bugs and sends 'Parking' every milliseconds (it happens sometimes)
	}

	// send the response
	handler.sendToAllClients(robotId, `RESPONSE: ${response}`);

	if (handler.accessState(robotId, 'requestDict') && (response.startsWith('Interrupted: ') || response.startsWith('Error: Failed going to goal'))) {
		// request failed or interrupted by an other request or by an EStop
		handler.accessState(robotId, 'interruptedRequest', handler.accessState(robotId, 'requestDict'));
		handler.accessState(robotId, 'requestDict', null);
	}

	if (response.startsWith('EStop')||response.startsWith('Error: Failed going to goal')) { // fail
		clearInterval(handler.accessState(robotId, 'statusTimer'));
		handler.sendToRobot(robotId, 'status');

		if (!handler.accessState(robotId, 'interruptedRequest')) {
			if (!handler.accessState(robotId, 'requestDict')) {
				console.log(`(${robotId}) Error: no request to be classify as a fail`);
				return;
			}
			handler.accessState(robotId, 'interruptedRequest', handler.accessState(robotId, 'requestDict'));
			handler.accessState(robotId, 'requestDict', null);
		}
		const src = handler.accessState(robotId, 'robotCurPos');
		const dest = handler.accessState(robotId, 'interruptedRequest').dest;

		handler.accessDB().collection(`fails_${robotId}`).findOne({label: src}).then(doc => {
			doc.fails[dest]++;
			handler.accessDB().collection(`fails_${robotId}`).updateOne(
				{_id: doc._id},
				{$set: {fails: doc.fails}}
			);
		});

		const response_update = JSON.stringify({src: src, dest:dest, time: -1});
		handler.sendToAllClients(robotId, `UPDATE VARIABLES: ${response_update}\n`, true);
	}




  if (response.startsWith('Arrived at ')||response.startsWith('Parked')||response.startsWith('DockingState: Docked')) {
		clearInterval(handler.accessState(robotId, 'statusTimer'));
		handler.sendToRobot(robotId, 'status');
		handler.accessState(robotId, 'interruptedRequest', null);
		handler.accessState(robotId, 'flagDockPark', false);


		var response_dest = response.substring('Arrived at '.length).toLowerCase().trim();

		if (response.startsWith('Parked') || response.startsWith('DockingState: Docked')) {
			if (!handler.accessState(robotId, 'destDockPark')) return;
			response_dest = handler.accessState(robotId, 'destDockPark');
			if (handler.accessState(robotId, 'requestDict')) {
				handler.accessState(robotId, 'requestDict').dest = handler.accessState(robotId, 'destDockPark');
			}
			handler.accessState(robotId, 'destDockPark', null);
		}

		updateDB(response_dest, robotId);

  } else if ((response.startsWith('Going to ')||response.startsWith('Parking')||response.startsWith('DockingState: Docking'))) {
		clearInterval(handler.accessState(robotId, 'statusTimer'));
		handler.sendToRobot(robotId, 'status');
		handler.accessState(robotId, 'statusTimer', setInterval(() => {
			handler.sendToRobot(robotId, 'status', robotId);
		}, handler.accessState(robotId, 'statusInterval')));

		if (handler.accessState(robotId, 'interruptedRequest')||handler.accessState(robotId, 'requestDict')) return;

		var dest;
		if (response.startsWith('Going to ')) {
			dest=response.substring('Going to '.length).trim().toLowerCase();
		} else if (response.startsWith('Parking')) {
			dest='parking';
			handler.accessState(robotId, 'flagDockPark', true);
		} else if (response.startsWith('DockingState: Docking')) {
			dest='docking';
			handler.accessState(robotId, 'flagDockPark', true);
		}

		handler.accessState(robotId, 'requestDict', {time: Date.now(), dest: dest});

	} else if (response.startsWith('DockingState: Undocking')) {
		// when the docking did not work
		if (handler.accessState(robotId, 'requestDict')) {
			handler.accessState(robotId, 'requestDict').time = Date.now();
			if (handler.accessState(robotId, 'destDockPark')) {
				handler.accessState(robotId, 'robotCurPos', handler.accessState(robotId, 'destDockPark'));
				handler.sendToAllClients(robotId, `UPDATE POS: ${handler.accessState(robotId, 'destDockPark')}`, true);
			} else {
				handler.accessState(robotId, 'robotCurPos', 'dockingstation1');
				handler.sendToAllClients(robotId, `UPDATE POS: dockingstation1`, true);
				console.log(`(${robotId}) Error: did not find a destination, defaulting to dockingstation1`);
			}
			handler.accessState(robotId, 'flagDockPark', true);
		}
	}
}


async function updateDB(response_dest, robotId) {
	if (!handler.accessState(robotId, 'requestDict')||response_dest!==handler.accessState(robotId, 'requestDict').dest) {
		handler.accessState(robotId, 'robotCurPos', response_dest);
		handler.sendToAllClients(robotId, `UPDATE POS: ${response_dest}`, true);
		// update the requestDict
		handler.accessState(robotId, 'requestDict', null);
		console.log(`(${robotId}) Error: wrong destination`);
		return
	}

	const src=handler.accessState(robotId, 'robotCurPos');
	const dest=handler.accessState(robotId, 'requestDict').dest;
	// update the current position of the robot
	handler.accessState(robotId, 'robotCurPos', dest);
	handler.sendToAllClients(robotId, `UPDATE POS: ${dest}`, true);

	const new_time = (Date.now()-handler.accessState(robotId, 'requestDict').time)/1000;
	console.log('NEW TIME: ', new_time);


	var flagError=false;
	for (let label of [src, dest]) {
		await handler.accessDB().collection(`labels_${robotId}`).findOne({label: label}).then(doc => {
			if (!doc) {
				flagError=true;
				console.log(`(${robotId}) Could not find ${label} in the database`);
			}
		})
		.catch(error => {
			console.log(error);
			flagError=true;
			console.log(`(${robotId}) Could not find ${label} in the database`);
		});
	}

	if  (flagError) return;



	handler.accessDB().collection(`times_${robotId}`).findOne({label: src}).then(doc => {
		doc.times[dest]=new_time;
		handler.accessDB().collection(`times_${robotId}`).updateOne(
			{_id: doc._id},
			{$set: {times: doc.times}}
		);
	});

	handler.accessDB().collection(`successes_${robotId}`).findOne({label: src}).then(doc => {
		doc.successes[dest]++;
		handler.accessDB().collection(`successes_${robotId}`).updateOne(
			{_id: doc._id},
			{$set: {successes: doc.successes}}
		);
	});

	const response_update = JSON.stringify({src: src, dest: dest, time: new_time});

	/*
	// update the data (matrix of times and successes)
	data.times[cur_id][next_id] = (data.times[cur_id][next_id]*data.successes[cur_id][next_id] + new_time) / (data.successes[cur_id][next_id] + 1);
	data.successes[cur_id][next_id] +=1;

	// round to 2 decimals
	data.times[cur_id][next_id] = Math.round(data.times[cur_id][next_id]*100)/100;

	response_update = JSON.stringify({src: cur_id, dest: next_id, time: data.times[cur_id][next_id]});

	*/

	// remove the request
	handler.accessState(robotId, 'requestDict', null);

	// send the updates to everyone (time + success)
	handler.sendToAllClients(robotId, `UPDATE VARIABLES: ${response_update}\n`, true)

}
