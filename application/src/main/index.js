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
		if (!hasHand) sendRequestServer('HAND');
		else sendRequestServer('HAND BACK');
  });

  ipcMain.on('MapAIP-vue-loaded', (event, arg) => { // from MapAIP
    mainWindow.webContents.send('updateData', data);
    mainWindow.webContents.send('updateWaitings', queueSize);
    fetchMap();
  });

  ipcMain.on('Sidebar-vue-loaded', (event, arg) => { // from sidebar
    mainWindow.webContents.send('updatePosition', curLocationRobot);
  });

  ipcMain.on('onSimulation', (event, arg) => { // from router
		mainWindow.webContents.send('onSimulation');
    flagSimulation=true;
		if (hasHand) {
			sendRequestServer('HAND BACK');
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
		sendRequestServer(`CODE ADMIN: ${arg}`);
  });

	ipcMain.on('quitAdmin', (event) => { // from parametres
		sendRequestServer('QUIT ADMIN');
  });


	ipcMain.on('syncPosRobot', (event, arg) => { // from simulation
    curPosRobotSimulation=curPosRobotLive;
		mainWindow.webContents.send('updateSyncRobot', true);
		mainWindow.webContents.send('updatePathSimulation', curPosRobotSimulation, curPosRobotSimulation, true);
		clearTimeout(parkingTimer);
		clearTimeout(dockingTimer);
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







var data;
var flagSimulation = true;
var gotoTimer = null;
var parkingTimer = null;
const parkingTimeout = 7 * 1000;
var dockingTimer = null;
const dockingTimeout = 15 * 60 * 1000;
const dockingFailProbRetry = 0.1;
const dockingFailProbChangeDock = 0.5;
var curDock = 'dockingstation2';
var curStandby = 'standby1';
var curPosRobotSimulation;
var curPosRobotLive;
var curLocationRobot = ''; // coords x, y, z example : '-384 1125 0.00'
var timeStatus = -1;
var timeEndAnim = -1;

const port_instance = 1234;
const port_server = 2345;
const port_map = 3001;

var clientSocket = null;
var clientConnected = false;
var hasHand = false;
var isAdmin = false;
const adminCommandsRegex = ['^\\s*gethandlist\\s*$', '^\\s*get\\s+hand\\s+list\\s*$', '^\\s*ghl\\s*$', '^\\s*removefromhandlist\\s+\\d+\\s*$', '^\\s*remove\\s+from\\s+hand\\s+list\\s+\\d+\\s*$', '^\\s*rfhl\\s+\\d+\\s*$'];

const server_host = 'localhost';
var serverSocket = null;
var serverConnected = false;
var queueSize = '0';


const tls = require('tls');
const net = require('net');



// CONNECT TO THE STUDENT'S CODE

const instanceSocket = net.createServer((socket) => {
  console.log('Client connected');
  clientSocket = socket;
  clientConnected = true
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
    clientConnected = false
    console.log('Client socket info:', socket.address());
  });

  // Event handler for errors
  socket.on('error', (err) => {
    console.error('Socket error:', err);
    clientConnected = false;
  });

});

instanceSocket.listen(port_instance, () => {
  console.log(`Telnet server listening on port ${port_instance}`);
});



function sendResponse(request) {
  if (!clientConnected) return;
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
			sendResponse("Vous n'êtes pas admin\n");
		} else if (indexCommand<=2) {
			sendRequestServer('GET HAND LIST');
		} else {
			const requestSplit = request.split(' ');
			console.log(requestSplit);
			sendRequestServer(`REMOVE FROM HAND LIST: ${parseInt(requestSplit[requestSplit.length-1])}`);
		}
		return;
	}

  if (flagSimulation) {
    responseSimulation(request);
  } else { // live
    if (hasHand) {
      sendRequestServer(`REQUEST: ${request}`);
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
		sendResponse(response)
	}


	if (!flagSimulationResponse && (response.indexOf('Arrived at ') === 0 || response.indexOf('Parked') === 0 || response.indexOf('DockingState: Docked') === 0)){
		mainWindow.webContents.send('removeIntervalLive', destination);
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

	//console.log(response, flagSimulationResponse, curPosRobotSimulation, destination);

  if (flagSimulationResponse) {
    mainWindow.webContents.send('updatePathSimulation', curPosRobotSimulation, destination, false);
  } else {
    timeStatus=Date.now();
    mainWindow.webContents.send('updateDestinationLive', destination);
  }
}







// CONNECT TO THE SERVER

function connectToServer() {
  serverSocket = net.connect({ host: server_host, port: port_server }, () => {
    console.log(`Connected to the server on port ${port_server}`);
    serverConnected = true;
    serverSocket.write('DATA') // fetch the data


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

    // Handle errors in the server connection
    serverSocket.on('error', (err) => {
      console.error('Socket error:', err);
      serverDisconnected()

      // Attempt to reconnect to the server after a delay
      setTimeout(connectToServer, 5000); // 5 seconds
    });
  });

  // If the connection to the server fails, retry after a delay
  serverSocket.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.log('WARNING: Server is not available, retrying in 5 seconds...');
      setTimeout(connectToServer, 5000); // 5 seconds
    } else {
      console.error('Socket error:', err);
    }
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
  try {
    const response = await fetch(`http://${server_host}:${port_map}/map`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.text();
    mainWindow.webContents.send('fetchMap', data);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}





function receiveResponseServer(response) { // from the server
  if (!response) return;
  console.log(`Received from server : ${response}`)

  if (response.indexOf('RESPONSE: ') === 0) {
    const response_body = response.substring('RESPONSE: '.length);
    receivedResponse(response_body, false);

  } else if (response.indexOf('UPDATE VARIABLES: ') === 0) {
		sendResponse(response);
    const update_json = response.substring('UPDATE VARIABLES: '.length).trim();
    const update = JSON.parse(update_json);
		const id_src = data.id.get(update.src)
		const id_dest = data.id.get(update.dest)
    if (update.time === -1) { // fail
      data.fails[id_src][id_dest] += 1;
    } else { // success
      data.successes[id_src][id_dest]+=1;
      data.times[id_src][id_dest]=update.time;
      curPosRobotLive = Array.from(data.id.keys())[id_dest];
			mainWindow.webContents.send('updateSyncRobot', curPosRobotSimulation===curPosRobotLive);
    }

    //console.log('UPDATED DATA : ', data);
    mainWindow.webContents.send('updateData', data);


  } else if (response.indexOf('ExtendedStatusForHumans: ') === 0) {

    const statusForHuman = response.trim().substring('ExtendedStatusForHumans: '.length);
    // update of the sidebar
    mainWindow.webContents.send('Sidebar-updateStatus', statusForHuman);

  } else if (response.indexOf('StateOfCharge: ') === 0) {
    const stateOfCharge = response.trim().substring('StateOfCharge: '.length);
    // update of the sidebar
    mainWindow.webContents.send('updateBattery', stateOfCharge);

  } else if (response.indexOf('Location: ') === 0) {
    const location = response.trim().substring('Location: '.length);
    // update of sidebar and MapAIP
    mainWindow.webContents.send('updatePosition', location);

    // draw the segment oldLocation -> curLocation in 'Live'
		if (timeEndAnim-Date.now()<100) { // 100 ms
			mainWindow.webContents.send('updatePathLive', curLocationRobot, location, Date.now()-timeStatus);

		} else {
			const temp_time=timeEndAnim-Date.now();
			const temp_curLocationRobot=curLocationRobot;
			const temp_location = location;
			const temp_duration = Date.now()-timeStatus
			setTimeout(()=> {
				mainWindow.webContents.send('updatePathLive', temp_curLocationRobot, temp_location, temp_duration);
			}, temp_time)
		}

    curLocationRobot = location
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
    mainWindow.webContents.send('updateWaitings', update_nb);
    queueSize=update_nb

  } else if (response === 'HAND TIMEOUT\n') {
    hasHand = false;
    mainWindow.webContents.send('receiveQueue', 'Demander la main');

	} else if (response.indexOf('DATA: ') === 0) {
    const response_array = response.substring('DATA: '.length).trim().split('FLAG_SPLIT');
    const jsonString = response_array[0];
    try {
      data = JSON.parse(jsonString);
      data.id = new Map(Object.entries(data.id));
    } catch (err) {
      console.log('Error parsing JSON:', err);
    }

    curPosRobotLive = response_array[1];;
		if (curPosRobotSimulation) {
			mainWindow.webContents.send('updateSyncRobot', curPosRobotSimulation===curPosRobotLive);
		} else {
			curPosRobotSimulation = curPosRobotLive;
		}
		mainWindow.webContents.send('updateData', data);
    mainWindow.webContents.send('updateWaitings', queueSize);
		mainWindow.webContents.send('updatePosition', curLocationRobot);

		fetchMap();

  } else if (response.indexOf('ADMIN REQUEST ACCEPTED') === 0) {
		mainWindow.webContents.send('adminRequestAccepted');
		isAdmin=true;

  } else if (response.indexOf('ADMIN REQUEST REJECTED') === 0) {
		mainWindow.webContents.send('adminRequestRejected');
		isAdmin=false;

	} else if (response.indexOf('HAND LIST: ') === 0) {
		if (response === 'HAND LIST: \n') {
			sendResponse('Hand list empty\n');
			return;
		}
		const result = response.substring('HAND LIST: '.length).trim().replace(/,/g, '\n');
		sendResponse(result);
	}
}


function sendRequestServer(request) {
  if (!serverConnected) return;
  console.log(`Send to server : ${request}`)
  serverSocket.write(request);
}


function responseSimulation(request) {
  if (request.toLowerCase().indexOf('goto ') == 0) {
    const whereto = request.toLowerCase().substring('goto '.length);
    if (!data.id.has(whereto)){
      //console.log('invalid destination')
      receivedResponse(`Unknown destination ${whereto}\n`, true);
      return
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
    if (regexDock.test(curPosRobotSimulation)) {
      for (let msg of msgDock) {
        receivedResponse(msg, true);
      }
    }
    receivedResponse(msgStart, true);

    const delta_time = 1000*data.times[data.id.get(curPosRobotSimulation)][data.id.get(whereto)];
    curPosRobotSimulation=whereto;
		mainWindow.webContents.send('updateSyncRobot', curPosRobotSimulation===curPosRobotLive);

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

		const delta_time = 1000*data.times[data.id.get(curPosRobotSimulation)][data.id.get(whereto)];
    const delta_time_dock = 1000*data.times[data.id.get(whereto)][data.id.get(dock)];
    curPosRobotSimulation=whereto;
		mainWindow.webContents.send('updateSyncRobot', curPosRobotSimulation===curPosRobotLive);

		clearTimeout(parkingTimer);
		clearTimeout(dockingTimer);
		clearTimeout(gotoTimer);
    gotoTimer = setTimeout(() => {
			mainWindow.webContents.send('updatePathSimulation', whereto, dock, false);
      curPosRobotSimulation=dock;
			dockingTimer = setTimeout(() => {
				for (let msg of msgDockEnd) {
          receivedResponse(msg, true, true);
        }
        if (false&&Math.random()<dockingFailProbRetry) { // dock failed
					if (Math.random()<dockingFailProbChangeDock) { // retry with a different dock
						curDock = 'dockingstation' + (1 + parseInt(curDock.substring('dockingstation'.length)));
						if (!data.id.has(curDock)) {
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
