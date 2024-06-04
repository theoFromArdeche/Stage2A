const net = require('net');

const port_server = 3456; // choose an open port
var startTime = Date.now();
const duration = 120*1000;

const server = net.createServer((socket) => {
  console.log('Client connected');

  socket.on('data', (data) => {
    console.log('Received from server : ', data.toString());
    // Send a response back to the first server
    var request = data.toString();
    if (request.startsWith('goto ')) {
      request = request.substring('goto '.length);
      startTime = Date.now();

		} else if (request === "dock") {
      request = 'dockingstation2';
    
    } else if (request === "status") {
      const response = status();
      socket.write(response);
      return;
    } else {
      socket.write("Unknown command "+request+"\n")
      return;
    }
    
    socket.write('Going to '+request+"\n")
    setTimeout(() => {
      socket.write('Arrived at '+request+"\n"); 
    }, duration);
  });

  socket.on('end', () => {
    console.log('Server disconnected');
  });
});

server.listen(port_server, () => {
  console.log(`Telnet server listening on port ${port_server}`);
});


function status() {
  const currentTime = Date.now();
  const elapsedTime = currentTime - startTime;

  // Calculate the sinusoidal values
  const A = 16700/2; // Amplitude for x-axis (constant in this case)
  const B = 44260; // Amplitude for y-axis

  const x = Math.round(A * (1 + Math.sin((10 * Math.PI / duration) * elapsedTime))) - 6260;
  const y = B*elapsedTime/duration - 12440;

  // return the sinusoidal values
  return `ExtendedStatusForHumans: docked\nStatus: docked\nStateOfCharge: ${Math.round((1-elapsedTime/duration)*100*100)/100}\nLocation: ${x} ${y} 0\n`
}


// Extreme pos:  -6260 -12440 10440 31820