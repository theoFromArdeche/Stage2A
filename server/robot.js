const net = require('net');

const port_server = 3456; // choose an open port

const server = net.createServer((socket) => {
  console.log('Client connected');

  socket.on('data', (data) => {
    console.log('Received from server : ', data.toString());
    // Send a response back to the first server
    const request = data.toString().substring('goto '.length);
    socket.write('Going to '+request)
    setTimeout(() => {
      socket.write('Arrived at '+request); 
    }, 2630);
  });

  socket.on('end', () => {
    console.log('Server disconnected');
  });
});

server.listen(port_server, () => {
  console.log(`Telnet server listening on port ${port_server}`);
});
