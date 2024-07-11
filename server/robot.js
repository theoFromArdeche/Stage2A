const net = require('net');

const port_robot = [3456, 3457, 3458];
const duration = 60*1000;
const password = 'password\n';

for (let port of port_robot) {
	const server = net.createServer((socket) => {
		console.log(`(${port}) Server connected`);
		var startTime = Date.now();
		var flagPassword = false;
		var flagGoto = false;

		function receivedData(data) {
			console.log(`(${port}) Received from server : ${data.toString()}`);
			if (!flagPassword) {
				flagPassword = (data === password);
				return;
			}

			// Send a response back to the first server
			var request = data.toString();
			if (request.startsWith('goto ')) {
				request = request.substring('goto '.length);
				startTime = Date.now();
				flagGoto = true;

			} else if (request === 'dock\n') {
				request = 'dockingstation2';

			} else if (request === 'status\n') {
				var response;
				if (flagGoto) response = status(startTime);
				else response = status(Date.now());
				socket.write(response);
				return;

			} else {
				socket.write(`CommandError: ${request}\n`)
				return;
			}

			socket.write(`Going to ${request}\n`)
			setTimeout(() => {
				socket.write(`Arrived at ${request}\n`);
				flagGoto = false;
			}, duration);
		}

		socket.on('data', (data) => {
			for (let d of data.toString().split('\n')) {
				if (!d) continue;
				receivedData(`${d}\n`);
			}
		});

		socket.on('end', () => {
			console.log('Server disconnected');
		});
	});

	server.listen(port, () => {
		console.log(`Telnet server listening on port ${port}`);
	});
}


function status(startTime) {
  const currentTime = Date.now();
  const elapsedTime = currentTime - startTime;

  // Calculate the sinusoidal values
	const coeffAmplitude = 0.80
  const A = 16700/2*coeffAmplitude; // Amplitude for x-axis (constant in this case)
  const B = 44260; // Amplitude for y-axis

  const x = Math.round(A * (1 + Math.sin((10 * Math.PI / duration) * elapsedTime))) - 6260*coeffAmplitude;
  const y = B*elapsedTime/duration - 12440;

	const futur_x = Math.round(A * (1 + Math.sin((10 * Math.PI / duration) * (elapsedTime+100)))) - 6260 * coeffAmplitude;
	const futur_y = B * (elapsedTime+100) / duration - 12440;

	const dx = futur_x - x;
	const dy = futur_y - y;

	const rotateDeg = Math.atan2(dy, dx)*180/Math.PI;

  return `ExtendedStatusForHumans: docked\nStatus: docked\nStateOfCharge: ${Math.round((1-elapsedTime/duration)*100*100)/100}\nLocation: ${x} ${y} ${rotateDeg}\nLocalizationScore: 63.5\nTemperature: 26.3\n`;
}


// Extreme pos:  -6260 -12440 10440 31820
