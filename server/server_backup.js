

const net = require('net');
const port_server = 2345;

let connectedClients = new Map(); // map to keep track of connected clients


const server = net.createServer((socket) => {
  console.log('Client connected');
  console.log('Client socket info:', socket.address());

  // create a unique identifier for the client
  const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`Client connected with id: ${clientId}`);

  // add the socket to the connected clients map
  connectedClients.set(clientId, socket);



  // received data from the client
  socket.on('data', (data) => {
    receiveRequest(socket, data.toString());
  });


  socket.on('end', () => {
    console.log('Client disconnected');
    console.log('Client socket info:', socket.address());
    // remove the socket from the connected clients map
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    connectedClients.delete(clientId);
  });


  // Event handler for errors
  socket.on('error', (err) => {
    console.error('Socket error:', err);
    // remove the socket from the connected clients map
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    connectedClients.delete(clientId);
  });


});

server.listen(port_server, () => {
  console.log(`Telnet server listening on port ${port_server}`);
});





function sendRequest(clientId, msg) {
  console.log("Send to client : " + msg)
  // get the socket for the client from the connected clients map
  const socket = connectedClients.get(clientId);
  if (socket) {
    socket.write(msg);
  }
}


function receiveRequest(socket, msg) {
  const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`Received from client ${clientId}: ${msg}`);

  if (msg.startsWith('TO EVERYONE: ')) {
    const msgForEveryone = msg.substring('TO EVERYONE: '.length);
    sendToEveryone(msgForEveryone);
  }
}


function sendToEveryone(msg) {
  console.log("Send to everyone : " + msg)
  // iterate over the connectedClients map
  for (let [clientId, socket] of connectedClients.entries()) {
    // send the message to the client
    socket.write(msg);
  }
}