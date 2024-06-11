const net = require('net');

const port_server = 3456; // choose an open port
var startTime = Date.now();
const duration = 120*1000;

const server = net.createServer((socket) => {
  console.log('Server connected');

  socket.on('data', (data) => {
    console.log('Received from server : ', data.toString());
    // Send a response back to the first server
    var request = data.toString();
    if (request.startsWith('goto ')) {
      request = request.substring('goto '.length);
      startTime = Date.now();

		} else if (request === 'dock\n') {
      request = 'dockingstation2';

    } else if (request === 'status\n') {
      const response = status();
      socket.write(response);
      return;
    } else {
      socket.write(`CommandError: ${request}\n`)
      return;
    }

    socket.write(`Going to ${request}\n`)
    setTimeout(() => {
      socket.write(`Arrived at ${request}\n`);
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
	const coeffAmplitude = 0.80
  const A = 16700/2*coeffAmplitude; // Amplitude for x-axis (constant in this case)
  const B = 44260; // Amplitude for y-axis

  const x = Math.round(A * (1 + Math.sin((10 * Math.PI / duration) * elapsedTime))) - 6260*coeffAmplitude;
  const y = B*elapsedTime/duration - 12440;

  // return the sinusoidal values
  return `ExtendedStatusForHumans: docked\nStatus: docked\nStateOfCharge: ${Math.round((1-elapsedTime/duration)*100*100)/100}\nLocation: ${x} ${y} 0\n`
}


// Extreme pos:  -6260 -12440 10440 31820
