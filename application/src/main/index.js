import { app, shell, BrowserWindow, ipcMain } from 'electron'
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
    fetchMap();
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
  console.log('Send to client : ' + request)
  clientSocket.write(request);
}

function receiveRequest(request) {
  console.log('Received from client : ', request);
  if (flagSimulation) {
    responseSimulation(request);
  } else { // live
    if (hasHand) {
      sendRequestServer('REQUEST: '+request);
    } //else {
    // TODO notify the student
    //}
  }
}

function receivedResponse(response) {
  mainWindow.webContents.send('updateStatus', response);
  sendResponse(response)
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
        receiveResponseServer(response);
      }
    });

    // Handle the end of the server connection
    serverSocket.on('end', () => {
      console.log('WARNING: Server disconnected');
      serverConnected = false;

      // Attempt to reconnect to the server after a delay
      setTimeout(connectToServer, 5000); // 5 seconds
    });

    // Handle errors in the server connection
    serverSocket.on('error', (err) => {
      console.error('Socket error:', err);
      serverConnected = false;

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
  console.log('Received from server : ' + response)

  if (response.indexOf('RESPONSE: ') === 0) {
    const response_body = response.substring('RESPONSE: '.length);
    receiveResponse(response_body);

  } else if (response.indexOf('UPDATE VARIABLES: ') === 0) {
    const update_json = response.substring('UPDATE VARIABLES: '.length);
    const update = JSON.parse(update_json);
    if (update.time === -1) { // fail
      data.fails[update.src][update.dest] += 1;
    } else { // sucess
      data.successes[update.src][update.dest]+=1;
      data.times[update.src][update.dest]=update.time;
      newPosRobot = update.dest;
    }
    if (!flagSimulation) curPosRobot=newPosRobot

    //console.log('UPDATED DATA : ', data);
    mainWindow.webContents.send('updateData', data);
  
  } else if (response.indexOf('UPDATE STATUS: ') === 0) {
    const response_status = response.substring('UPDATE STATUS: '.length).split('\n');
    const status = response_status[0].trim();
    const stateOfCharge = response_status[1].substring('StateOfCharge: '.length).trim();
    const location = response_status[2].substring('Location: '.length).trim();

    // update de la sidebar
    mainWindow.webContents.send('updateBattery', stateOfCharge);
    mainWindow.webContents.send('updatePosition', location);
    mainWindow.webContents.send('updateStatus', status);

  } else if (response === 'HAND REQUEST ACCEPTED') {
    hasHand = true;
    mainWindow.webContents.send('receiveQueue', "Vous avez la main");

  } else if (response.indexOf('HAND QUEUE POSITION: ') === 0) {
    const pos = response.substring('HAND QUEUE POSITION: '.length);

    // update du boutton dans la fenêtre live
    mainWindow.webContents.send('receiveQueue', "Position file d'attente : "+pos); 

  } else if (response.indexOf('HAND QUEUE UPDATE: ') === 0) {
    const update_nb = response.substring('HAND QUEUE UPDATE: '.length);

    // update de la sidebar
    mainWindow.webContents.send('updateWaitings', update_nb); 

  } else if (response === 'HAND TIMEOUT') {
    hasHand = false;
    mainWindow.webContents.send('receiveQueue', "Demander la main");

	} else if (response.indexOf('DATA: ') === 0) { 
    const response_array = response.substring('DATA: '.length).split("FLAG_SPLIT");
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
  console.log('Send to server : ' + request)
  serverSocket.write(request);
}


function responseSimulation(request) {
  if (request.toLowerCase().indexOf("goto ") == 0) {
    const whereto = request.toLowerCase().substring('goto '.length);
    if (!data.id.has(whereto)){
      console.log("invalid destination")
      return
    }
    const msg1 = "Going to " + whereto
    const msg2 = "Arrived at " + whereto
    const delta_time = data.times[data.id.get(curPosRobot)][data.id.get(whereto)]
    mainWindow.webContents.send('updateStatus', msg1);
    curPosRobot=whereto
    setTimeout(function () {
      mainWindow.webContents.send('updateStatus', msg2);
    }, delta_time*1000);
  }

  else if (request.toLowerCase() === "dock") {
    console.log("dock")
    const whereto = 'dockingstation2';
    const msg1 = "Going to dock"
    const msg2 = "Docking"
    const msg3 = "Docked"
    const delta_time = data.times[data.id.get(curPosRobot)][data.id.get(whereto)]
    receivedResponse(msg1);
    curPosRobot=whereto
    setTimeout(function () {
      receivedResponse(msg2);
      setTimeout(function () {
        receivedResponse(msg3);
      }, 1000);
    }, delta_time*1000);

  }
}
