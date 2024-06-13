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

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.on('requestHand', (event, arg) => {
    // send a hand request to the server
    requestHand();
  });

  ipcMain.on('MapAIP-vue-loaded', (event, arg) => {
    mainWindow.webContents.send('updateData', data);
    mainWindow.webContents.send('updateWaitings', queueSize);
    fetchMap();
  });

  ipcMain.on('Sidebar-vue-loaded', (event, arg) => {
    mainWindow.webContents.send('updatePosition', curLocationRobot);
  });

  ipcMain.on('onSimulation', (event, arg) => {
    flagSimulation=true;
  });

  ipcMain.on('onLive', (event, arg) => {
    flagSimulation=false;
    curPosRobot=newPosRobot;
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
var flagSimulation= true;
var curPosRobot;
var newPosRobot;
var curLocationRobot = ''; // coords x, y, z example : '-384 1125 0.00'
var timeStatus = -1;
var timeEndAnim = -1;

const net = require('net');

const port_instance = 1234;
const port_server = 2345;
const port_map = 3001;

var clientSocket = null;
var clientConnected = false;
var hasHand = false;

const server_host = 'localhost';
var serverSocket = null;
var serverConnected = false;
var queueSize = 0;




// CONNECT TO THE STUDENT'S CODE

const instanceSocket = net.createServer((socket) => {
  console.log('Client connected');
  clientSocket = socket;
  clientConnected = true
  console.log('Client socket info:', socket.address());
  // received data from the client
  socket.on('data', (data) => {
    receiveRequest(data.toString().trim())
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

function receivedResponse(response) {
  mainWindow.webContents.send('updateStatus', response);
  sendResponse(response)
  if (response.indexOf('Going to ') !== 0) return;

  if (flagSimulation) {
    const destination = response.substring('Going to '.length).trim().toLowerCase();
    mainWindow.webContents.send('updateRoute', curPosRobot, destination);
  } else {
    timeStatus=Date.now();
  }
}


function requestHand() {
  sendRequestServer('HAND')
}








// CONNECT TO THE SERVER

function connectToServer() {
  serverSocket = net.createConnection({ host: server_host, port: port_server }, () => {
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
    receivedResponse(response_body);

  } else if (response.indexOf('UPDATE VARIABLES: ') === 0) {
    const update_json = response.substring('UPDATE VARIABLES: '.length).trim();
    const update = JSON.parse(update_json);
		const id_src = data.id.get(update.src)
		const id_dest = data.id.get(update.dest)
    if (update.time === -1) { // fail
      data.fails[id_src][id_dest] += 1;
    } else { // success
      data.successes[id_src][id_dest]+=1;
      data.times[id_src][id_dest]=update.time;
      newPosRobot = Array.from(data.id.keys())[id_dest];
			if (!flagSimulation) curPosRobot=newPosRobot
    }

    //console.log('UPDATED DATA : ', data);
    mainWindow.webContents.send('updateData', data);


  } else if (response.indexOf('ExtendedStatusForHumans: ') === 0) {
    const statusForHuman = response.trim().substring('ExtendedStatusForHumans: '.length);
    // update de la sidebar
    mainWindow.webContents.send('Sidebar-updateStatus', statusForHuman);

  } else if (response.indexOf('StateOfCharge: ') === 0) {
    const stateOfCharge = response.trim().substring('StateOfCharge: '.length);
    // update de la sidebar
    mainWindow.webContents.send('updateBattery', stateOfCharge);

  } else if (response.indexOf('Location: ') === 0) {
    const location = response.trim().substring('Location: '.length);
    // update de la sidebar
    mainWindow.webContents.send('updatePosition', location);

    // if in 'Live' draw the segment oldLocation - curLocation
    if (!flagSimulation) {
      if (timeEndAnim-Date.now()<100) { // 100 ms
        mainWindow.webContents.send('drawSegment', curLocationRobot, location, Date.now()-timeStatus);

      } else {
        const temp_time=timeEndAnim-Date.now();
        const temp_curLocationRobot=curLocationRobot;
        const temp_location = location;
        const temp_duration = Date.now()-timeStatus
        setTimeout(()=> {
          mainWindow.webContents.send('drawSegment', temp_curLocationRobot, temp_location, temp_duration);
        }, temp_time)
      }
    }

    curLocationRobot = location
    timeEndAnim = 2*Date.now()-timeStatus
    timeStatus = Date.now();

  } else if (response === 'HAND REQUEST ACCEPTED\n') {
    hasHand = true;
    mainWindow.webContents.send('receiveQueue', 'Vous avez la main');

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

    curPosRobot = response_array[1];
    newPosRobot = curPosRobot;
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
      receivedResponse(`Unknown destination ${whereto}\n`);
      return
    }
    const msg1 = `Going to ${whereto}\n`
    const msg2 = `Arrived at ${whereto}\n`
    const delta_time = data.times[data.id.get(curPosRobot)][data.id.get(whereto)]
    receivedResponse(msg1);
    curPosRobot=whereto
    setTimeout(function () {
      receivedResponse(msg2);
    }, delta_time*1000);


  } else if (request.toLowerCase() === 'dock') {
    console.log('dock')
    const whereto = 'dockingstation2';
    const msg1 = 'Going to dockingstation2\n'
    const msg2 = 'Docking\n'
    const msg3 = 'Docked\n'
    const delta_time = data.times[data.id.get(curPosRobot)][data.id.get(whereto)]
    receivedResponse(msg1);
    curPosRobot=whereto
    setTimeout(function () {
      receivedResponse(msg2);
      setTimeout(function () {
        receivedResponse(msg3);
      }, 1000);
    }, delta_time*1000);

  } else {
    receivedResponse(`CommandError: ${request}\n`);
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
