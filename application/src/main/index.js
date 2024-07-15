import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

var mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    maxWidth: 1920,
    minWidth: 900,
    height: 670,
    maxHeight: 1080,
    minHeight: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('handButtonTrigered', (event, arg) => { // from live
		if (!hasHand) sendToServer('HAND\n');
		else sendToServer('HAND BACK\n');
  });

  ipcMain.on('MapAIP-vue-loaded', (event, arg) => { // from MapAIP
    mainWindow.webContents.send('updateData', DATA.get(robotCurId));
    fetchMap();
  });

  ipcMain.on('Sidebar-vue-loaded', (event, arg) => { // from sidebar
    mainWindow.webContents.send('updatePosition', robotCurLocation);
		for (let id of robotIds) {
			mainWindow.webContents.send('addRobot', id);
		}
		if (!robotsCurStatus.size) return;

		for (let robotId of robotsCurStatus.keys()) {
			for (let status of robotsCurStatus.get(robotId).values()) {
				receiveResponseServer(`${robotId}: ${status}`, true);
			}
		}
  });

  ipcMain.on('onSimulation', (event, arg) => { // from router
		mainWindow.webContents.send('onSimulation');
    flagSimulation=true;
		if (hasHand) {
			sendToServer('HAND BACK\n');
		}
  });

  ipcMain.on('onLive', (event, arg) => { // from router
		mainWindow.webContents.send('onLive');
    flagSimulation=false;
  });


	ipcMain.on('onParametres', (event, arg) => { // from router
		mainWindow.webContents.send('onParametres');
  });

	ipcMain.on('codeAdmin', (event, arg) => { // from parametres
		sendToServer(`CODE ADMIN: ${arg}\n`);
  });

	ipcMain.on('quitAdmin', (event) => { // from parametres
		sendToServer('QUIT ADMIN\n');
  });


	ipcMain.on('syncPosRobot', (event, arg) => { // from simulation
    robotCurPosSimulation=robotCurPosLive;
		mainWindow.webContents.send('updateSyncRobot', true);
		mainWindow.webContents.send('updatePathSimulation', robotCurPosSimulation, robotCurPosSimulation, true);
		clearTimeout(parkingTimer);
		clearTimeout(dockingTimer);
  });

	ipcMain.on('changeRobot', (event, newRobotId) => { // from simulation
    sendToServer(`CHANGE ROBOTID: ${newRobotId}\n`);
  });



  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})







const DATA = new Map();
const robotsCurStatus = new Map();
const robotsCurPos = new Map();
var flagSimulation = true;
var updatePathLiveTimer;
var gotoTimer;
var parkingTimer;
const parkingTimeout = 7 * 1000;
var dockingTimer;
const dockingTimeout = 15 * 60 * 1000;
const dockingFailProbRetry = 0.1;
const dockingFailProbChangeDock = 0.5;
var curDock = 'dockingstation2';
var curStandby = 'standby1';
var robotCurPosSimulation;
var robotCurPosLive;
var robotCurId;
const robotIds = new Set();
var robotCurLocation = ''; // coords x, y, z example : '-384 1125 0.00'
var timeStatus = -1;
var timeEndAnim = -1;

const instancePort = 1234;
const serverPort = 2345;
const mapPort = 3001;

var clientSocket;
var flagClientConnected = false;
var hasHand = false;
var isAdmin = false;
const adminCommandsRegex = ['^\\s*gethandlist\\s*$', '^\\s*get\\s+hand\\s+list\\s*$', '^\\s*ghl\\s*$', '^\\s*removefromhandlist\\s+\\d+\\s*$', '^\\s*remove\\s+from\\s+hand\\s+list\\s+\\d+\\s*$', '^\\s*rfhl\\s+\\d+\\s*$'];

const serverHost = 'localhost';
var serverSocket;
var serverConnected = false;

const tls = require('tls');
const net = require('net');


function resetVariables() {
  clearTimeout(updatePathLiveTimer);
	clearTimeout(gotoTimer);
	clearTimeout(parkingTimer);
	clearTimeout(dockingTimer);
	curDock = 'dockingstation2';
	curStandby = 'standby1';
	robotCurPosSimulation = null;
	robotCurPosLive = null;
	timeStatus = -1;
	timeEndAnim = -1;
	hasHand = false;
	mainWindow.webContents.send('receiveQueue', 'Demander la main');
}



// CONNECT TO THE STUDENT'S CODE

const instanceSocket = net.createServer((socket) => {
  console.log('Client connected');
  clientSocket = socket;
  flagClientConnected = true
  console.log('Client socket info:', socket.address());
  // received data from the client
  socket.on('data', (data) => {
		const responses = data.toString().split('\n');
      for (let response of responses) {
        if (!response) continue
        receiveRequest(`${response.trim()}`);
      }
  });

  socket.on('end', () => {
    console.log('Client disconnected');
    flagClientConnected = false
    console.log('Client socket info:', socket.address());
  });

  // Event handler for errors
  socket.on('error', (err) => {
    console.error('Socket error:', err);
    flagClientConnected = false;
  });

});

instanceSocket.listen(instancePort, () => {
  console.log(`Telnet server listening on port ${instancePort}`);
});



function sendToClient(request) {
  if (!flagClientConnected) return;
  console.log(`Send to client : ${request}`)
  clientSocket.write(request);
}

function receiveRequest(request) {
  console.log('Received from client : ', request);
	var indexCommand=-1;
	for (let i=0; i<adminCommandsRegex.length; i++) {
		if (new RegExp(adminCommandsRegex[i]).test(request.toLowerCase())) {
			indexCommand=i;
			break;
		}
	}
	if (indexCommand>=0) {
		if (!isAdmin) {
			sendToClient("Vous n'êtes pas admin\n");
		} else if (indexCommand<=2) {
			sendToServer('GET HAND LIST\n');
		} else {
			const requestSplit = request.split(' ');
			sendToServer(`REMOVE FROM HAND LIST: ${parseInt(requestSplit[requestSplit.length-1])}\n`);
		}
		return;
	}

  if (flagSimulation) {
    responseSimulation(request);
  } else { // live
    if (hasHand) {
      sendToServer(`REQUEST: ${request}\n`);
    } else {
      dialog.showMessageBox({
        type: 'warning',
        title: 'Warning',
        message: "Une requête a été reçue, mais vous n'avez pas la main.\n\nPour utiliser le jumeau numérique : allez dans l'onglet 'Simulation'.\nPour utiliser le robot réel : allez dans l'onglet 'Live', demandez la main, puis envoyez des requêtes à l'adresse localhost avec le port 1234.",
        buttons: ['OK']
      });
    }
  }
}

function receivedResponse(response, flagSimulationResponse, onlyUpdate=false) {
	mainWindow.webContents.send('updateStatus', response, !flagSimulationResponse);
	if (hasHand !== flagSimulationResponse) {
		sendToClient(response)
	}


	if (!flagSimulationResponse && (response.indexOf('Arrived at ') === 0 || response.indexOf('Parked') === 0 || response.indexOf('DockingState: Docked') === 0)){
		mainWindow.webContents.send('removeIntervalLive', destination);
		timeStatus = -1;
		return;
	}


  if (onlyUpdate || (response.indexOf('Going to ') !== 0 && response.indexOf('Parking') !== 0 && response.indexOf('DockingState: Docking') !== 0)) return;
	var destination;
	if (response.indexOf('Parking') === 0) {
		destination = curStandby;
	} else if (response.indexOf('DockingState: Docking') === 0) {
		destination = 'station ld/lynx'+curDock.substring('dockingstation'.length);
	} else { // Going to
		destination = response.substring('Going to '.length).trim().toLowerCase();
	}

	//console.log(response, flagSimulationResponse, robotCurPosSimulation, destination);

  if (flagSimulationResponse) {
    mainWindow.webContents.send('updatePathSimulation', robotCurPosSimulation, destination, false);
  } else {
    timeStatus=Date.now();
    mainWindow.webContents.send('updateDestinationLive', destination);
  }
}







// CONNECT TO THE SERVER

function connectToServer() {
  serverSocket = net.connect({ host: serverHost, port: serverPort }, () => {
    console.log(`Connected to the server on port ${serverPort}`);
    serverConnected = true;
    serverSocket.write('DATA\n') // fetch the data
  });

	// Handle incoming data from the server
	serverSocket.on('data', (data) => {
		const responses = data.toString().split('\n');
		for (let response of responses) {
			if (!response) continue
			receiveResponseServer(`${response}\n`);
		}
	});

	// Handle the end of the server connection
	serverSocket.on('end', () => {
		console.log('WARNING: Server disconnected');
		serverDisconnected()

		// Attempt to reconnect to the server after a delay
		setTimeout(connectToServer, 5000); // 5 seconds
	});

  // If the connection to the server fails, retry after a delay
  serverSocket.on('error', (err) => {
    console.log('WARNING: Server is not available, retrying in 5 seconds...');
    setTimeout(connectToServer, 5000); // 5 seconds
  });
}

connectToServer();


function serverDisconnected() {
  serverConnected = false;
  hasHand = false;
  mainWindow.webContents.send('receiveQueue', 'Demander la main');
	isAdmin = false;
	mainWindow.webContents.send('adminRequestRejected');
  dialog.showMessageBox({
    type: 'warning',
    title: 'Warning',
    message: "Vous n'êtes plus connecté au serveur.",
    buttons: ['OK']
  });
}

async function fetchMap() {
	if (!robotCurId) return;
  try {
    const response = await fetch(`http://${serverHost}:${mapPort}/map_${robotCurId}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.text();
    mainWindow.webContents.send('fetchMap', data, robotCurLocation);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}





function receiveResponseServer(responseRaw, onlyUpdate=false) { // from the server
  if (!responseRaw) return;
  if (!onlyUpdate) console.log(`Received from server : ${responseRaw}`);
	const receivedRobotId = responseRaw.split(': ')[0];
	const response = responseRaw.substring(receivedRobotId.length + ': '.length);
	if (!robotIds.has(receivedRobotId)
		&& response.indexOf('ADD ROBOTID') !== 0
		&& response.indexOf('DATA: ') !== 0
		&& response.indexOf('ADMIN REQUEST ACCEPTED') !==0
	  && response.indexOf('ADMIN REQUEST REJECTED') !==0) {
		return;
	}


  if (response.indexOf('RESPONSE: ') === 0) {
    const response_body = response.substring('RESPONSE: '.length);
    receivedResponse(response_body, false);

  } else if (response.indexOf('UPDATE VARIABLES: ') === 0) {
		sendToClient(response);
    const update_json = response.substring('UPDATE VARIABLES: '.length).trim();
    const update = JSON.parse(update_json);
		const id_src = DATA.get(receivedRobotId).get('id').get(update.src)
		const id_dest = DATA.get(receivedRobotId).get('id').get(update.dest)
    if (update.time === -1) { // fail
      DATA.get(receivedRobotId).get('fails')[id_src][id_dest] += 1;
    } else { // success
      DATA.get(receivedRobotId).get('successes')[id_src][id_dest]+=1;
      DATA.get(receivedRobotId).get('times')[id_src][id_dest]=update.time;
      robotCurPosLive = Array.from(DATA.get(receivedRobotId).get('id').keys())[id_dest];
			mainWindow.webContents.send('updateSyncRobot', robotCurPosSimulation===robotCurPosLive);
    }

    //console.log('UPDATED DATA : ', data);
		if (receivedRobotId !== robotCurId) return;

		// update the data of MapAIP
    mainWindow.webContents.send('updateData', DATA.get(robotCurId));


  } else if (response.indexOf('ExtendedStatusForHumans: ') === 0) {
    const statusForHuman = response.trim().substring('ExtendedStatusForHumans: '.length);
		robotsCurStatus.get(receivedRobotId).set('ExtendedStatusForHumans', response);
    // update of the sidebar
    mainWindow.webContents.send('Sidebar-updateStatus', receivedRobotId, statusForHuman);

  } else if (response.indexOf('StateOfCharge: ') === 0) {
    const stateOfCharge = response.trim().substring('StateOfCharge: '.length);
		robotsCurStatus.get(receivedRobotId).set('StateOfCharge', response);
    // update of the sidebar
    mainWindow.webContents.send('updateBattery', receivedRobotId, stateOfCharge);

  } else if (response.indexOf('Location: ') === 0) {
    const location = response.trim().substring('Location: '.length);
		robotsCurStatus.get(receivedRobotId).set('Location', response);
    // update of the sidebar
    mainWindow.webContents.send('updatePosition', receivedRobotId, location);
		if (receivedRobotId !== robotCurId) return;

		if (onlyUpdate) {
			robotCurLocation=location;
			return;
		}

		if (timeStatus === -1) return;

    // draw the segment oldLocation -> curLocation in 'Live'
		if (timeEndAnim-Date.now()<100) { // 100 ms
			mainWindow.webContents.send('updatePathLive', robotCurLocation, location, Date.now()-timeStatus);

		} else {
			const temp_time=timeEndAnim-Date.now();
			const temp_robotCurLocation=robotCurLocation;
			const temp_location = location;
			const temp_duration = Date.now()-timeStatus
			updatePathLiveTimer = setTimeout(()=> {
				mainWindow.webContents.send('updatePathLive', temp_robotCurLocation, temp_location, temp_duration);
			}, temp_time)
		}

    robotCurLocation = location
    timeEndAnim = 2*Date.now()-timeStatus
    timeStatus = Date.now();

  } else if (response === 'HAND REQUEST ACCEPTED\n') {
    hasHand = true;
    mainWindow.webContents.send('receiveQueue', 'Rendre la main');

  } else if (response.indexOf('HAND QUEUE POSITION: ') === 0) {
    const pos = response.substring('HAND QUEUE POSITION: '.length).trim();

    // update du boutton dans la fenêtre live
    mainWindow.webContents.send('receiveQueue', `Position file d'attente : ${pos}`);

  } else if (response.indexOf('HAND QUEUE UPDATE: ') === 0) {
    const update_nb = response.substring('HAND QUEUE UPDATE: '.length).trim();

    // update de la sidebar
    mainWindow.webContents.send('updateWaitings', receivedRobotId, update_nb);
		robotsCurStatus.get(receivedRobotId).set('waitings', response);

  } else if (response === 'HAND TIMEOUT\n') {
    hasHand = false;
    mainWindow.webContents.send('receiveQueue', 'Demander la main');

	} else if (response.indexOf('DATA: ') === 0) {
    const response_array = response.substring('DATA: '.length).trim().split('FLAG_SPLIT');
    const jsonString = response_array[0];
    try {
      const receivedData = new Map(Object.entries(JSON.parse(jsonString)));
			receivedData.set('id', new Map(Object.entries(receivedData.get('id'))));
			DATA.set(receivedRobotId, receivedData);
    } catch (err) {
      console.log('Error parsing JSON:', err);
    }

		if (robotCurId && robotCurId !== 'undefined' && robotCurId !== receivedRobotId) return;

		resetVariables();

    robotCurPosLive = response_array[1];
		robotCurPosSimulation = robotCurPosLive;

		robotCurId = receivedRobotId;
		robotCurLocation = response_array[2];
		robotsCurPos.set(receivedRobotId, robotCurPosLive);

		mainWindow.webContents.send('updateData', DATA.get(robotCurId));
		mainWindow.webContents.send('reRender');

  } else if (response.indexOf('ADMIN REQUEST ACCEPTED') === 0) {
		mainWindow.webContents.send('adminRequestAccepted');
		isAdmin=true;

  } else if (response.indexOf('ADMIN REQUEST REJECTED') === 0) {
		mainWindow.webContents.send('adminRequestRejected');
		isAdmin=false;

	} else if (response.indexOf('HAND LIST: ') === 0) {
		if (response === 'HAND LIST: \n') {
			sendToClient('Hand list empty\n');
			return;
		}
		const result = response.substring('HAND LIST: '.length).trim().replace(/,/g, '\n');
		sendToClient(result);

	} else if (response.indexOf('ADD ROBOTID') === 0) {
		if (robotIds.has(receivedRobotId)) return;
		robotIds.add(receivedRobotId);
		robotsCurStatus.set(receivedRobotId, new Map());

		mainWindow.webContents.send('addRobot', receivedRobotId);
		sendToServer(`ROBOTID ADDED: ${receivedRobotId}\n`);

	} else if (response.indexOf('REMOVE ROBOTID') === 0) {
	if (!robotIds.has(receivedRobotId)) return;
		robotIds.delete(receivedRobotId);
		robotsCurStatus.delete(receivedRobotId);
		robotsCurPos.delete(receivedRobotId);
		mainWindow.webContents.send('removeRobot', receivedRobotId);

	} else if (response.indexOf('SELECTED ROBOTID') === 0) {
    console.log('receivedRobotId', receivedRobotId)
		robotCurId = receivedRobotId;

		resetVariables();

    robotCurPosLive = robotsCurPos.get(robotCurId);
		robotCurPosSimulation = robotCurPosLive;

		robotCurLocation = robotsCurStatus.get(robotCurId).get('Location').substring('Location: '.length).trim();

		mainWindow.webContents.send('updateData', DATA.get(robotCurId));
		mainWindow.webContents.send('reRender');

	} else if (response.indexOf('UPDATE POS: ') === 0) {
		const newPos = response.substring('UPDATE POS: '.length).trim();
		robotsCurPos.set(receivedRobotId, newPos);
	}
}


function sendToServer(request) {
  if (!serverConnected) return;
  console.log(`Send to server : ${request}`)
  serverSocket.write(request);
}


function responseSimulation(request) {
  console.log('robotCurId', robotCurId);
  if (request.toLowerCase().indexOf('goto ') == 0) {
    const whereto = request.toLowerCase().substring('goto '.length);
    if (!DATA.get(robotCurId).get('id').has(whereto)){
      //console.log('invalid destination')
      receivedResponse(`Unknown destination ${whereto}\n`, true);
      return;
    }

    const msgDock = [
      'DockingState: Undocking ForcedState: Unforced ChargeState: Not\n',
      'DockingState: Undocking ForcedState: Unforced ChargeState: Bulk\n',
      'DockingState: Undocking ForcedState: Unforced ChargeState: Not\n',
      'DockingState: Undocked ForcedState: Unforced ChargeState: Not\n'
    ];

    const msgStart = `Going to ${whereto}\n`;
    const msgEnd = `Arrived at ${whereto}\n`;

    const regexDock = new RegExp('^dockingstation\\d+$')
    if (regexDock.test(robotCurPosSimulation)) {
      for (let msg of msgDock) {
        receivedResponse(msg, true);
      }
    }
    receivedResponse(msgStart, true);

		const delta_time = 1000*DATA.get(robotCurId).get('times')[DATA.get(robotCurId).get('id').get(robotCurPosSimulation)][DATA.get(robotCurId).get('id').get(whereto)];
    robotCurPosSimulation=whereto;
		mainWindow.webContents.send('updateSyncRobot', robotCurPosSimulation===robotCurPosLive);

		clearTimeout(parkingTimer);
		clearTimeout(dockingTimer);
		clearTimeout(gotoTimer);
    gotoTimer = setTimeout(() => {
      receivedResponse(msgEnd, true);
			if (whereto!=='standby1') {
				parkingTimer = setTimeout(() => {
					responseSimulation('goto standby1');
				}, parkingTimeout);
			} else {
				dockingTimer = setTimeout(() => {
					responseSimulation('dock');
				}, dockingTimeout);
			}
    }, delta_time);


  } else if (request.toLowerCase() === 'dock') {
    const msgDockStart = [
      'DockingState: Undocked ForcedState: Unforced ChargeState: Not\n',
      'DockingState: Docking ForcedState: Unforced ChargeState: Not\n'
    ];

    const msgDockEnd = [
      'DockingState: Docking ForcedState: Unforced ChargeState: Bulk\n',
      'DockingState: Docked ForcedState: Unforced ChargeState: Bulk\n'
    ];

    const whereto = 'station ld/lynx'+curDock.substring('dockingstation'.length);
		const dock = curDock;

    for (let msg of msgDockStart) {
      receivedResponse(msg, true);
    }

		const delta_time = 1000*DATA.get(robotCurId).get('times')[DATA.get(robotCurId).get('id').get(robotCurPosSimulation)][DATA.get(robotCurId).get('id').get(whereto)];
    const delta_time_dock = 1000*DATA.get(robotCurId).get('times')[DATA.get(robotCurId).get('id').get(whereto)][DATA.get(robotCurId).get('id').get(dock)];
    robotCurPosSimulation=whereto;
		mainWindow.webContents.send('updateSyncRobot', robotCurPosSimulation===robotCurPosLive);

		clearTimeout(parkingTimer);
		clearTimeout(dockingTimer);
		clearTimeout(gotoTimer);
    gotoTimer = setTimeout(() => {
			mainWindow.webContents.send('updatePathSimulation', whereto, dock, false);
      robotCurPosSimulation=dock;
			dockingTimer = setTimeout(() => {
				for (let msg of msgDockEnd) {
          receivedResponse(msg, true, true);
        }
        if (false&&Math.random()<dockingFailProbRetry) { // dock failed
					if (Math.random()<dockingFailProbChangeDock) { // retry with a different dock
						curDock = 'dockingstation' + (1 + parseInt(curDock.substring('dockingstation'.length)));
						if (!DATA.get(robotCurId).get('id').has(curDock)) {
							curDock = 'dockingstation1';
						}
					}
          responseSimulation('dock');
        }
			}, delta_time_dock);
    }, delta_time);

  } else {
    receivedResponse(`CommandError: ${request}\n`, true);
  }
}



/*

regex to replace 'some phrase ' + variable + ' some other phrase ' + variable2 + ...
to : `some phrase ${varibale} some other phrase ${variable2} ...`

('|`)([^'`]*?)\1\s*\+\s*([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+)\s*\+\s*('|`)([^'`]*?)\5
`$2${$3}${$4}$6`

('|`)([^'`]*?)\1\s*\+\s*('|`)([^'`]*?)\3|\$\{\}
$1$2$4$1

*/
