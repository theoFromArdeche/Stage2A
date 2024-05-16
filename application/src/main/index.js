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

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

const net = require('net');

const port_server = 1234; // choose an open port

var clientSocket;
var clientConnected=false;

const server = net.createServer((socket) => {
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

server.listen(port_server, () => {
  console.log(`Telnet server listening on port ${port_server}`);
});



function sendRequest(msg) {
  if (!clientConnected) return;
  console.log("Send to client : " + msg)
  clientSocket.write(msg);
}

function receiveRequest(msg) {
  console.log('Received from client : ', msg);
  mainWindow.webContents.send('receiveResponse', msg);
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