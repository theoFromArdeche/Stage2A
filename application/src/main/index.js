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

  ipcMain.on('sendRequest', (event, arg) => {
    // send a request to the client
    sendRequest(arg);
  });

  ipcMain.on('requestHand', (event, arg) => {
    // send a hand request to the server
    requestHand();
  });

  ipcMain.on('vue-loaded', (event, arg) => {
    mainWindow.webContents.send('updateData', data);
  });

  ipcMain.on('onSimulation', (event, arg) => {
    flagSimulation=true;
  });

  ipcMain.on('onLive', (event, arg) => {
    flagSimulation=false;
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

var data;
var flagSimulation= true;

const net = require('net');

const port_instance = 1234; // choose an open port

var clientSocket = null;
var clientConnected=false;
var hasHand = false;

// set up l'instance pour être accessible pour l'etudiant
const instanceSocket = net.createServer((socket) => {
  console.log('Client connected');
  clientSocket=socket;
  clientConnected=true
  console.log('Client socket info:', socket.address());
  // received data from the client
  socket.on('data', (data) => {
    receiveRequest(data.toString())
  });
  
  socket.on('end', () => {
    console.log('Client disconnected');
    clientConnected=false
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



function sendRequest(request) {
  if (!clientConnected) return;
  console.log('Send to client : ' + request)
  clientSocket.write(request);
}

function receiveRequest(request) {
  console.log('Received from client : ', request);
  if (flagSimulation) {
    
  } else { // live
    if (hasHand) {
      sendRequestServer('REQUEST: '+request)
    } //else {
    // TODO notify the student
    //}
  }
}

function receiveResponse(response) {
  mainWindow.webContents.send('receiveResponse', response);
}


function requestHand() {
  sendRequestServer('HAND')
}


const port_server = 2345;
const server_host = 'localhost'; // the server's IP address or hostname
var serverConnected = false; 
var serverSocket = null;
// connect to the server
function connectToServer() {
  serverSocket = net.createConnection({ host:server_host, port: port_server }, () => {
    console.log(`Connected to the server on port ${port_server}`);
    serverConnected = true;
    serverSocket.write('DATA')

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

function receiveResponseServer(response) { // from the server
  if (!response) return;
  console.log('Received from server : ' + response)

  if (response.indexOf('RESPONSE: ')==0) {
		const response_body = response.substring('RESPONSE: '.length);
    receiveResponse(response_body);

  } else if (response.indexOf('UPDATE: ')==0) {
    const update_json = response.substring('UPDATE: '.length);
    const update = JSON.parse(update_json);
    if (update.time===-1) { // fail
      data.fails[update.src][update.dest]+=1;
    } else { // sucess
      data.successes[update.src][update.dest]+=1;
      data.times[update.src][update.dest]=update.time;
    }
    console.log('UPDATED DATA : ', data);
    mainWindow.webContents.send('updateData', data);

  } else if (response === 'hand request accepted') {
    hasHand=true;

	} else if (response === 'hand timeout') {
    hasHand=false;

	} else if (response.indexOf('DATA: ')==0) { 
    const jsonString = response.substring('DATA: '.length);
    try {
      data = JSON.parse(jsonString);
      data.id = new Map(Object.entries(data.id));
    } catch (err) {
      console.log('Error parsing JSON:', err);
    }
  }
}


function sendRequestServer(request) {
  if (!serverConnected) return;
  console.log('Send to server : ' + request)
  serverSocket.write(request);
}


/*



initialisation de l'instance: 
ping le server (pour qu'il puisse nous envoyer les majs)
fetch les données (matrice des temps et des réussites)





etudiant -> instance




live:
l'étudiant demande la main (via l'instance (on appuie sur le boutton demander la main))
l'instance demande au server et recup la réponse




live: (on pars du principe qu'on a la main pour le serveur)
transmettre la requete au server
instance -> server :

récup la réponse (toutes les réponses du robot)
récup donné par le server : temps, réusite

on met a jour les infos locales (matrice des temps, de réussites)
mettre a jour le visu

on envoie les réponses a l'étudiant




live: (on pars du principe qu'on a PAS la main pour le serveur)
on notifie l'étudiant qu'il n'a pas la main et on lui donne sa position dans la file d'attente



simulation:
renvoyer la reponse que le robot aurait renvoyé
mettre a jour le visu (temps + réussite avec une ligne entre le départ et l'arrivée)
(a voir si on a fait une maj du visu instantanée ou genre 2sec pour une animation)








server:


reçois un ping, enregistre l'instance

ping l'instance toutes les x secondes pour voir si elle est encore la
si timeout -> il supprime l'instance


reçois une requete


si pas dispo, ajoute a la file d'attente
(potentiellement notifie l'instance)


si il est dispo:
envoyer la requete au robot
recup la reponse
mettre a jour les données (matrice des temps et des réussites)
envoyer la réponse à l'instance qui a fait la requete
envoyer les modifs a tous le monde (temps + réussite)




une instance demande la main: 
on l'ajoute a la file d'attente (si déjà prise)

il y a un timeout quand on donne la main à une instance


*/