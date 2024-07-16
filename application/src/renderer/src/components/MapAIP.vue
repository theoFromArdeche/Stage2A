<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { Heap } from 'heap-js'

const props = defineProps({
  flagLive: {
    type: Boolean,
    required: true
  }
});

const ipcRenderer = window.electron.ipcRenderer;



var lineDetectedCoords = [];
var pointDetectedCoords = [];
var forbiddenLines = [];
var forbiddenAreas = [];
var interestPoints = [];
var buttons = [];
var minPos = { x: 0, y: 0 };
var maxPos = { x: 0, y: 0 };

var DATA = null;
const simulationTimer = ref(null);
const animLine = ref(new Set());
const SHOW_PATH = true;
const SHOW_PROJECTED_PATH = true;
const destinationLive = ref(null);
const projectedPathInterval = ref(null);
const refreshRateProjectedPath = 0.1 * 1000;


const canvas_MapAIP = ref(null);
const canvas_path = ref(null);
const canvas_pathTemp = ref(null);
const canvas_projectedPath = ref(null);
const canvas_projectedPathTemp = ref(null);
const canvas_grid = ref(null);

var ctx_MapAIP, ctx_path, ctx_pathTemp, ctx_projectedPath, ctx_projectedPathTemp, ctx_grid;


const robot = ref(null);
const curPosRobot = ref(null);

const containerButtons = ref(null);

const onScreen = ref(false);
const flagMapFetched = ref(false);

const curLineStart = ref([]);
const curLineEnd = ref([]);
const curLineProgress = ref(null);
const curLineDuration = ref(null);


const tailleCarré = 10;
const distanceWeight = 16;
const dangerDistance = 5;
var GRID = null;
const heightGRID = ref(null);
const widthGRID = ref(null);

const needRender = ref(false);

const colorsList = [
	"rgb(255, 0, 0)", "rgb(253, 36, 0)", "rgb(251, 53, 0)", "rgb(249, 67, 0)", "rgb(246, 79, 0)", "rgb(243, 89, 0)",
	"rgb(240, 98, 0)", "rgb(236, 108, 0)", "rgb(231, 117, 0)", "rgb(226, 125, 0)", "rgb(221, 132, 0)", "rgb(216, 139, 0)",
	"rgb(211, 146, 0)", "rgb(205, 153, 0)", "rgb(200, 159, 0)", "rgb(194, 165, 0)", "rgb(188, 170, 0)", "rgb(181, 176, 0)",
	"rgb(175, 181, 0)", "rgb(168, 187, 0)", "rgb(161, 192, 0)", "rgb(153, 197, 0)", "rgb(144, 202, 0)", "rgb(135, 207, 0)",
	"rgb(124, 212, 0)", "rgb(111, 217, 0)", "rgb(96, 222, 0)", "rgb(80, 226, 0)", "rgb(59, 231, 0)", "rgb(19, 235, 15)"
];



async function resetVariables() {
	lineDetectedCoords = [];
	pointDetectedCoords = [];
	forbiddenLines = [];
	forbiddenAreas = [];
	interestPoints = [];
	buttons = [];
	minPos = { x: 0, y: 0 };
	maxPos = { x: 0, y: 0 };

	clearTimeout(simulationTimer.value);
	clearInterval(projectedPathInterval.value);

	await nextTick();
	for (let item of animLine.value) {
		cancelAnimationFrame(item);
		animLine.value.delete(item);
	}

	destinationLive.value = null;

	curLineStart.value = [];
	curLineEnd.value = [];
	curLineProgress.value = null;
	curLineDuration.value = null;

	GRID = null;
	heightGRID.value = null;
	widthGRID.value = null;

	flagMapFetched.value = false;

	while (containerButtons.value.firstChild) {
		containerButtons.value.removeChild(containerButtons.value.firstChild);
	}

	const ctx_MapAIP = canvas_MapAIP.value.getContext('2d')
  const ctx_path = canvas_path.value.getContext('2d');
  const ctx_pathTemp = canvas_pathTemp.value.getContext('2d');
  const ctx_projectedPath = canvas_projectedPath.value.getContext('2d');
  const ctx_projectedPathTemp = canvas_projectedPathTemp.value.getContext('2d');

	ctx_MapAIP.clearRect(0, 0, canvas_MapAIP.value.width, canvas_MapAIP.value.height);
	ctx_path.clearRect(0, 0, canvas_path.value.width, canvas_path.value.height);
	ctx_pathTemp.clearRect(0, 0, canvas_pathTemp.value.width, canvas_pathTemp.value.height);
	ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);
	ctx_projectedPathTemp.clearRect(0, 0, canvas_projectedPathTemp.value.width, canvas_projectedPathTemp.value.height);
}



ipcRenderer.on('onSimulation', (event) => {
	onScreen.value=!props.flagLive;
	if (onScreen.value) {
		updateRobotPos();
		if (needRender.value) reRender();
	}
})



ipcRenderer.on('onLive', (event) => {
	onScreen.value=props.flagLive;
	if (onScreen.value) {
		updateRobotPos();
		if (needRender.value) reRender();
	}
})



ipcRenderer.on('onParametres', (event) => {
	onScreen.value=false;
})



ipcRenderer.on('updateData', (event, arg) => {
  DATA = arg;
});



ipcRenderer.on('reRender', (event) => {
	reRender();
});

async function reRender() {
	if (!onScreen.value) {
		needRender.value=true;
		return;
	}
	needRender.value=false;
	await resetVariables();
	await renderMap();
}


ipcRenderer.on('fetchMap', async (event, mapData, location) => {
	if (flagMapFetched.value || !onScreen.value) return;

	flagMapFetched.value=true;
	updateInfos(mapData);
	tailleEtTracer();

	await nextTick();
	curPosRobot.value=location;
	updateRealRobotPos(location);
});



ipcRenderer.on('updatePathSimulation', async (event, src, dest, clearCanva) => {
	if (props.flagLive) return;
	ctx_path.clearRect(0, 0, canvas_path.value.width, canvas_path.value.height);
	ctx_pathTemp.clearRect(0, 0, canvas_pathTemp.value.width, canvas_pathTemp.value.height);
	ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);
	ctx_projectedPathTemp.clearRect(0, 0, canvas_projectedPathTemp.value.width, canvas_projectedPathTemp.value.height);

	if (!DATA.get('id').has(src)||!DATA.get('id').has(dest)) return;

	const duration = DATA.get('times')[DATA.get('id').get(src)][DATA.get('id').get(dest)]*1000;

	const button_start = document.getElementById(src);
	const button_end = document.getElementById(dest);

	//console.log(src, dest);

	const diff = canvas_path.value.width / canvas_path.value.offsetWidth;

	var start_x = button_start.offsetLeft * diff;
	var start_y = button_start.offsetTop * diff;
	const end_x = button_end.offsetLeft * diff;
	const end_y = button_end.offsetTop * diff;

	// actual coordinates of the robot
	const robot_x = robot.value.offsetLeft * diff;
	const robot_y = robot.value.offsetTop * diff;
	if (simulationTimer.value) {
		clearTimeout(simulationTimer.value);
		await nextTick();
		ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);
		ctx_projectedPathTemp.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);

		if (!clearCanva) {
			start_x = robot_x;
			start_y = robot_y;
		}

		if (animLine.value) {
			// robot.value.style.top and robot.value.style.left are not in sync with the actual coordinates
			// because the robot is moving toward the position at robot.value.style.top and robot.value.style.left
			// so we need to update them to stop the robot
			if (clearCanva) {
				robot.value.style.transition = '0s';
				await nextTick();
			}
			robot.value.style.top = `${start_y / diff / containerButtons.value.offsetHeight * 100}%`;
			robot.value.style.left = `${start_x / diff / containerButtons.value.offsetWidth * 100}%`;
			await nextTick();
			for (let item of animLine.value) {
				cancelAnimationFrame(item);
				animLine.value.delete(item);
			}
			ctx_path.drawImage(canvas_pathTemp.value, 0, 0); // line not finished
		}

		if (clearCanva) {
			ctx_path.clearRect(0, 0, canvas_path.value.width, canvas_path.value.height);
			ctx_pathTemp.clearRect(0, 0, canvas_pathTemp.value.width, canvas_pathTemp.value.height);
			ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);
			ctx_projectedPathTemp.clearRect(0, 0, canvas_projectedPathTemp.value.width, canvas_projectedPathTemp.value.height);
			return;
		}
	} else {
		ctx_path.clearRect(0, 0, canvas_path.value.width, canvas_path.value.height);
		ctx_pathTemp.clearRect(0, 0, canvas_pathTemp.value.width, canvas_pathTemp.value.height);

		if (start_x!==robot_x || start_y!==robot_y) {
			robot.value.style.top = `${start_y / diff / containerButtons.value.offsetHeight * 100}%`;
			robot.value.style.left = `${start_x / diff / containerButtons.value.offsetWidth * 100}%`;
			await nextTick();
		}
	}

	const data_id_start = DATA.get('id').get(src);
	const data_id_end = DATA.get('id').get(dest);
	const successes = DATA.get('successes')[data_id_start][data_id_end];
	const fails = DATA.get('fails')[data_id_start][data_id_end];
	var success_rate=colorsList.length-1;
	if (successes+fails!==0) {
		success_rate = Math.round((colorsList.length-1)*successes/(successes+fails));
	}

	ctx_path.strokeStyle = colorsList[success_rate];
	ctx_path.lineWidth = 5;
	ctx_pathTemp.strokeStyle = colorsList[success_rate];
	ctx_pathTemp.lineWidth = 5;

	ctx_projectedPath.lineWidth = 2.5;
	ctx_projectedPath.strokeStyle = 'lightblue';
	ctx_projectedPathTemp.lineWidth = 2.5;
	ctx_projectedPathTemp.strokeStyle = 'lightblue';

	const path = dijkstra(start_x, start_y, end_x, end_y);
	if (!path) return;

	var totalDist=0;
	path[0][2] = totalDist;
	for (let i=1; i<path.length; i++) {
		totalDist+=Math.abs(path[i][0]-path[i-1][0])+Math.abs(path[i][1]-path[i-1][1]);
		path[i][2] = totalDist;
	}

	await animatePath(path, 1, start_x, start_y, duration, true, SHOW_PATH, SHOW_PROJECTED_PATH, ctx_path, ctx_pathTemp);
	simulationTimer.value=null;
});



ipcRenderer.on('updatePathLive', async (event, src, dest, duration) => {
	if (!props.flagLive) return;

	const src_arr = src.split(' ');
	const dest_arr = dest.split(' ');
	var start_x = parseFloat(src_arr[0]);
	var start_y = parseFloat(src_arr[1]);
	var end_x = parseFloat(dest_arr[0]);
	var end_y = parseFloat(dest_arr[1]);

	const transformedSrc = transformCoord(start_x, start_y, canvas_MapAIP.value.width);
	const transformedDest = transformCoord(end_x, end_y, canvas_MapAIP.value.width);

	start_x=transformedSrc.x; start_y=transformedSrc.y;
	end_x=transformedDest.x; end_y=transformedDest.y;

	const diff = canvas_path.value.width / canvas_path.value.offsetWidth;

	// actual coordinates of the robot
	const robot_x = robot.value.offsetLeft * diff;
	const robot_y = robot.value.offsetTop * diff;

	if (Math.abs(start_x-robot_x)>50 || Math.abs(start_y-robot_y)>50) {
		robot.value.style.top = `${start_y / diff / containerButtons.value.offsetHeight * 100}%`;
		robot.value.style.left = `${start_x / diff / containerButtons.value.offsetWidth * 100}%`;
		await nextTick();
	}

	const rotationDeg = 270-parseFloat(src_arr[2]);

	ctx_path.strokeStyle = 'rgb(19, 235, 15)';
	ctx_path.lineWidth = 5;
	ctx_pathTemp.strokeStyle = 'rgb(19, 235, 15)';
	ctx_pathTemp.lineWidth = 5;

	createAnimation(start_x, start_y, end_x, end_y, rotationDeg, duration, true, true, ctx_path, ctx_pathTemp, false);
});



ipcRenderer.on('updateDestinationLive', (event, arg) => {
	if (!props.flagLive) return;
	destinationLive.value = arg;
	startIntervalProjectedPath();
});



ipcRenderer.on('removeIntervalLive', (event, arg) => {
	if (!props.flagLive) return;
	clearInterval(projectedPathInterval.value);
	ctx_projectedPathTemp.clearRect(0, 0, canvas_projectedPathTemp.value.width, canvas_projectedPathTemp.value.height);
	ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);
});



document.addEventListener('keydown', function (event) {
	if (event.key === 'c') {
		ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);
		ctx_path.clearRect(0, 0, canvas_path.value.width, canvas_path.value.height);
	}
});






async function updateRobotPos() {
	if (!animLine.value.size) return;
	robot.value.style.transition = '0s';
	await nextTick();
	const dx = curLineEnd.value[0] - curLineStart.value[0];
	const dy = curLineEnd.value[1] - curLineStart.value[1];
	const curX = curLineStart.value[0] + dx * curLineProgress.value;
	const curY = curLineStart.value[1] + dy * curLineProgress.value;

	const diff = canvas_path.value.width / canvas_path.value.offsetWidth;

	robot.value.style.left = `${curX / diff / containerButtons.value.offsetWidth * 100}%`;
	robot.value.style.top = `${curY / diff / containerButtons.value.offsetHeight * 100}%`;
	robot.value.style.left = `${curX / diff / containerButtons.value.offsetWidth * 100}%`; // because javascript
	await nextTick();

	const remainingDuration = curLineDuration.value * (1 - curLineProgress.value);
	robot.value.style.transition = `left linear ${remainingDuration}ms, top linear ${remainingDuration}ms, transform linear 500ms`;
	await nextTick();

	robot.value.style.top = `${curLineEnd.value[1] / diff / containerButtons.value.offsetHeight * 100}%`;
	robot.value.style.left = `${curLineEnd.value[0] / diff / containerButtons.value.offsetWidth * 100}%`;
}



function updateRealRobotPos(location) {
	const location_arr = location.split(' ');
	const location_x = parseFloat(location_arr[0]);
	const location_y = parseFloat(location_arr[1]);
	const transformedPos = transformCoord(location_x, location_y, 2560);
	const rotationDeg = 270-parseFloat(location_arr[2]);

	createAnimation(transformedPos.x, transformedPos.y, transformedPos.x, transformedPos.y, rotationDeg, 0, true, false, null, null, false);
};



function isDigit(charac) {
	return '0' <= charac && charac <= '9';
}

function getCoords(line) {
  const coords = [0, 0, 0, '']
  let pointeur = 0
  let i = 0
  let temp = ''

  while (pointeur <= 2 && i < line.length) {
    if (line[i] === '-' || (line[i] === '.' && isDigit(line[i + 1])) || isDigit(line[i])) {
      temp += line[i]
    } else if (temp !== '' && line[i] === ' ') {
      coords[pointeur] = parseFloat(temp)
      temp = ''
      pointeur += 1
    }
    i += 1
  }
  coords[3] = getRoomName(line)
  return coords
}



function getRoomName(line) {
  const regex = /ICON\s+"([^"]+)"/
  const match = line.match(regex)
  return match[1]
}



function inverseRotate(x, y, angleDegrees) {
  const angleRadians = angleDegrees * Math.PI / 180;
  const cosTheta = Math.cos(angleRadians);
  const sinTheta = Math.sin(angleRadians);

  const xPrime = x * cosTheta + y * sinTheta;
  const yPrime = -x * sinTheta + y * cosTheta;

  return [xPrime, yPrime];
}



function getCoordsFa(line) {
  const coords = [[0, 0], [0, 0], 0];
  let compteur = 0;
  let i = 0;
  let temp = '';

  while (compteur <= 6 && i < line.length) {
    if (line[i] === '-' || (line[i] === '.' && isDigit(line[i + 1])) || isDigit(line[i])) {
      temp += line[i];
    }
    if ((temp !== '' && line[i] === ' ') || i === line.length - 1) {
      switch (compteur) {
        case 2:
          coords[2] = parseFloat(temp);
          break;
        case 3:
          coords[0][0] = parseFloat(temp);
          break;
        case 4:
          coords[0][1] = parseFloat(temp);
          break;
        case 5:
          coords[1][0] = parseFloat(temp);
          break;
        case 6:
          coords[1][1] = parseFloat(temp);
          break;
      }
      temp = '';
      compteur += 1;
    }
    i += 1;
  }

  const heading = coords[2];
  const originalCoords = coords.slice(0, 2).map(([x, y]) => inverseRotate(x, y, -heading));

  return { originalCoords, heading };
}



function getCoordsFl(line) {
  let coords = [
    [0, 0],
    [0, 0]
  ]
  let compteur = 0
  let i = 0
  let temp = ''

  while (compteur <= 6 && i < line.length) {
    if (line[i] === '-' || (line[i] === '.' && isDigit(line[i + 1])) || isDigit(line[i])) {
      temp += line[i]
    }
    if (temp !== '' && (line[i] === ' ' || i === line.length - 1)) {
      switch (compteur) {
        case 3:
          coords[0][0] = parseFloat(temp)
          break
        case 4:
          coords[0][1] = parseFloat(temp)
          break
        case 5:
          coords[1][0] = parseFloat(temp)
          break
        case 6:
          coords[1][1] = parseFloat(temp)
          break
      }
      temp = ''
      compteur += 1
    }
    i += 1
  }
  return coords
}



function getLineDetectedCoords(line) {
  const parts = line.split(' ').map(Number)
  return [parts.slice(0, 2), parts.slice(2)]
}



function getPointDetectedCoords(line) {
  const parts = line.split(' ').map(Number)
  return parts.slice(0, 2)
}



function updateInfos(content) {
  const lines = content.split('\n')
  let parsingDetectedLines = false
  let parsingDetectedPoints = false
  for (const line of lines) {
    if (line.startsWith('Cairn:')) {
      if (line.includes('ForbiddenLine')) {
        forbiddenLines.push(getCoordsFl(line))
      } else if (line.includes('ForbiddenArea')) {
        forbiddenAreas.push(getCoordsFa(line))
      } else {
        interestPoints.push(getCoords(line))
      }
    } else if (line.trim() === 'LINES') {
      parsingDetectedLines = true
    } else if (parsingDetectedLines) {
      if (line.trim() && line.includes(' ')) {
        lineDetectedCoords.push(getLineDetectedCoords(line))
      } else {
        parsingDetectedLines = false
        parsingDetectedPoints = true
      }
    } else if (parsingDetectedPoints) {
      if (line.trim() && line.includes(' ')) {
        pointDetectedCoords.push(getPointDetectedCoords(line))
      } else {
        parsingDetectedPoints = false
      }
    }
  }
  getMin()
  //console.log(lineDetectedCoords)
  //console.log(pointDetectedCoords)
}



function getMin() {
  function getMinPoint(point) {
    if (point[0] < minPos.x) {
      minPos.x = point[0]
    }
    if (point[1] < minPos.y && point[1] != -17580 && point[1] != -17540) {
      minPos.y = point[1]
    }
    if (point[0] > maxPos.x) {
      maxPos.x = point[0]
    }
    if (point[1] > maxPos.y) {
      maxPos.y = point[1]
    }
  }
  pointDetectedCoords.forEach((detectedPoints) => {
    getMinPoint(detectedPoints)
  })
  //console.log("Extreme pos: ", minPos.x, minPos.y, maxPos.x, maxPos.y)
  maxPos.x -= minPos.x
  maxPos.y -= minPos.y
}



function transformCoord(x, y, width) {
	const diff = width / maxPos.y
	//if ((1 - (y - minPos.y) / maxPos.y)*width<350) console.log((1 - (y - minPos.y) / maxPos.y) * width, x, y)
	return {
		x: (1 - (y - minPos.y) / maxPos.y) * width,
		y: (maxPos.x - x + minPos.x) * diff
	}
}



function bresenham(x1, y1, x2, y2) {
	// Bresenham's line algorithm
	const dx = Math.abs(x2 - x1);
	const dy = Math.abs(y2 - y1);
	const sx = (x1 < x2) ? 1 : -1;
	const sy = (y1 < y2) ? 1 : -1;
	var err = dx - dy;

	const steps = Math.max(dx, dy);

	for (let i = 0; i <= steps; i++) {
		let column = Math.floor(x1 / tailleCarré);
		let row = Math.floor(y1 / tailleCarré);

		if (row >= 0 && row < heightGRID.value && column >= 0 && column < widthGRID.value) {
			dangerCalc(row, column)
		}

		if (2 * err > -dy) {
			err -= dy;
			x1 += sx;
		}
		if (2 * err < dx) {
			err += dx;
			y1 += sy;
		}
	}
}



function dangerCalc(row, column) {
	GRID[row][column] = Infinity;
	for (let deltaRow=-dangerDistance; deltaRow<=dangerDistance; deltaRow++) {
		for (let deltaColumn=-dangerDistance; deltaColumn<=dangerDistance; deltaColumn++) {
			if (row+deltaRow>=heightGRID.value||column+deltaColumn>=widthGRID.value||row+deltaRow<0||column+deltaColumn<0) continue;
			GRID[row+deltaRow][column+deltaColumn]=Math.max(GRID[row+deltaRow][column+deltaColumn], distanceWeight)
		}
	}
}



function tailleEtTracer() {
	//ctx.clearRect(0, 0, canvas.width, canvas.height)

	canvas_MapAIP.value.width = 2560
	canvas_MapAIP.value.height = (maxPos.x * canvas_MapAIP.value.width) / maxPos.y

	canvas_path.value.width = canvas_MapAIP.value.width
	canvas_path.value.height = canvas_MapAIP.value.height
	canvas_pathTemp.value.width = canvas_MapAIP.value.width
	canvas_pathTemp.value.height = canvas_MapAIP.value.height

	canvas_projectedPath.value.width = canvas_MapAIP.value.width
	canvas_projectedPath.value.height = canvas_MapAIP.value.height
	canvas_projectedPathTemp.value.width = canvas_MapAIP.value.width
	canvas_projectedPathTemp.value.height = canvas_MapAIP.value.height

	canvas_grid.value.width = canvas_MapAIP.value.width
	canvas_grid.value.height = canvas_MapAIP.value.height


	widthGRID.value =  Math.ceil(canvas_grid.value.width/tailleCarré);
	heightGRID.value = Math.ceil(canvas_grid.value.height/tailleCarré);
	GRID = Array.from({ length: heightGRID.value }, () => Array(widthGRID.value).fill(1));


	pointDetectedCoords.forEach((point) => {
		const transformed = transformCoord(point[0], point[1], canvas_MapAIP.value.width)
		ctx_MapAIP.fillStyle = 'blue'
		ctx_MapAIP.beginPath()
		ctx_MapAIP.arc(transformed.x, transformed.y, 0.5, 0, 2 * Math.PI)
		ctx_MapAIP.fill()

		const row = Math.floor(transformed.y/tailleCarré);
		const column = Math.floor(transformed.x/tailleCarré);
		dangerCalc(row, column);
	})

	//interestPoints = [[-291, 1132, 142, "test"]]
	interestPoints.forEach((point) => {
		const transformed = transformCoord(point[0], point[1], containerButtons.value.offsetWidth)
		const button = document.createElement('button')
		const text_bouton = document.createElement('p')
		text_bouton.innerText = point[3]
		text_bouton.style.opacity = 0
		button.style.position = 'absolute'
		text_bouton.style.position = 'absolute'
		button.style.width = '1%'
		button.style.left = `${Math.round((transformed.x / containerButtons.value.offsetWidth) * 100)}%`
		text_bouton.style.left = `${Math.round((transformed.x / containerButtons.value.offsetWidth) * 100)}%`
		const container_height = (maxPos.x * containerButtons.value.offsetWidth) / maxPos.y
		button.style.top = `${Math.round((transformed.y / container_height) * 100)}%`
		text_bouton.style.top = `${Math.round((transformed.y / container_height) * 100)}%`
		text_bouton.style.pointerEvents="none"
		button.id = point[3].toLowerCase()
		button.onclick = function(){text_bouton.style.opacity = 1 - text_bouton.style.opacity}
		buttons.push(button)
		containerButtons.value.appendChild(text_bouton)
		containerButtons.value.appendChild(button)
	})

	forbiddenLines.forEach((line) => {
		const start = transformCoord(line[0][0], line[0][1], canvas_MapAIP.value.width)
		const end = transformCoord(line[1][0], line[1][1], canvas_MapAIP.value.width)
		ctx_MapAIP.strokeStyle = 'red'
		ctx_MapAIP.lineWidth = 2
		ctx_MapAIP.beginPath()
		ctx_MapAIP.moveTo(start.x, start.y)
		ctx_MapAIP.lineTo(end.x, end.y)
		ctx_MapAIP.stroke()

		bresenham(start.x, start.y, end.x, end.y);
	})

	forbiddenAreas.forEach((area) => {
		const { originalCoords, heading } = area;

		var rotationDeg;
		if (heading===0) rotationDeg = 0;
		else rotationDeg = 270 - heading;

		const bottomRight = transformCoord(originalCoords[0][0], originalCoords[0][1], canvas_MapAIP.value.width);
		const topLeft = transformCoord(originalCoords[1][0], originalCoords[1][1], canvas_MapAIP.value.width);

		const centerX = (bottomRight.x + topLeft.x) / 2;
  	const centerY = (bottomRight.y + topLeft.y) / 2;

		const width = Math.abs(bottomRight.x - topLeft.x);
  	const height = Math.abs(bottomRight.y - topLeft.y);

		ctx_MapAIP.save();
		ctx_MapAIP.translate(centerX, centerY);
		ctx_MapAIP.rotate(rotationDeg * Math.PI / 180);
		ctx_MapAIP.fillStyle = 'rgba(255, 0, 0, 0.5)';
		ctx_MapAIP.beginPath();
		ctx_MapAIP.rect(-width / 2, -height / 2, width, height);
		ctx_MapAIP.fill();
		ctx_MapAIP.strokeStyle = 'red';
		ctx_MapAIP.stroke();
		ctx_MapAIP.restore();

		for (let row=Math.floor(topLeft.y/tailleCarré); row<=Math.floor(bottomRight.y/tailleCarré); row++) {
			for (let column=Math.floor(topLeft.x/tailleCarré); column<=Math.floor(bottomRight.x/tailleCarré); column++) {
				if (row>=heightGRID.value||column>=widthGRID.value) continue;
				dangerCalc(row, column);
			}
		}
	})

	lineDetectedCoords.forEach((line) => {
		const start = transformCoord(line[0][0], line[0][1], canvas_MapAIP.value.width);
		const end = transformCoord(line[1][0], line[1][1], canvas_MapAIP.value.width);
		ctx_MapAIP.strokeStyle = 'purple';
		ctx_MapAIP.lineWidth = 1;
		ctx_MapAIP.beginPath();
		ctx_MapAIP.moveTo(start.x, start.y);
		ctx_MapAIP.lineTo(end.x, end.y);
		ctx_MapAIP.stroke();

		bresenham(start.x, start.y, end.x, end.y);
	})
	//drawGrid();
	//drawGridWeight();
}



function drawGrid() {
	ctx_grid.lineWidth = 1;
	ctx_grid.strokeStyle = "black";
	for (let row=0; row<heightGRID.value; row++) {
		ctx_grid.beginPath();
		ctx_grid.moveTo(0, row*tailleCarré);
		ctx_grid.lineTo(canvas_grid.value.width-1, row*tailleCarré);
		ctx_grid.stroke();
	}
	for (let column=0; column<widthGRID.value; column++) {
		ctx_grid.beginPath();
		ctx_grid.moveTo(column*tailleCarré, 0);
		ctx_grid.lineTo(column*tailleCarré, canvas_grid.value.height-1);
		ctx_grid.stroke();
	}
}



function drawGridWeight() {
	for (let row=0; row<heightGRID.value; row++) {
		for (let column=0; column<widthGRID.value; column++) {
			if (GRID[row][column]===1) continue;
			ctx_grid.beginPath();
			ctx_grid.fillStyle = GRID[row][column]===Infinity?'black':'grey';
			ctx_grid.rect(column*tailleCarré, row*tailleCarré, tailleCarré, tailleCarré);
			ctx_grid.fill();
		}
	}
}



function dijkstra(start_x, start_y, end_x, end_y) {
	if (!heightGRID.value||!widthGRID.value) return null;

	const path = [];
	const start_row = Math.floor(start_y / tailleCarré);
	const start_column = Math.floor(start_x / tailleCarré);
	const end_row = Math.floor(end_y / tailleCarré);
	const end_column = Math.floor(end_x / tailleCarré);

	if (start_row>=heightGRID.value||start_row<0||start_column>=widthGRID.value||start_column<0||
			end_row>=heightGRID.value||end_row<0||end_column>=widthGRID.value||end_column<0) {
			return null;
	}

	if (start_row===end_row&&start_column===end_column) {
		return [
			[Math.round((start_column+0.5) * tailleCarré), Math.round((start_row+0.5) * tailleCarré)],
			[Math.round((end_column+0.5) * tailleCarré), Math.round((end_row+0.5) * tailleCarré)]
		]
	}


	const distance = Array.from({ length: heightGRID.value }, () => Array(widthGRID.value).fill(Infinity));
	const parent = Array.from({ length: heightGRID.value }, () => Array(widthGRID.value).fill(null));
	const visited = Array.from({ length: heightGRID.value }, () => Array(widthGRID.value).fill(false));

	distance[start_row][start_column] = 0;

	const pq = new Heap((a, b) => a[0] - b[0]);
	pq.push([0, start_row, start_column, null]);

	const r2 = Math.sqrt(2);

	const directions = [ // delta row, delta column, coeff distance
		[1, 0, 1], [-1, 0, 1],
		[1, 1, r2], [-1, 1, r2],
		[0, 1, 1], [0, -1, 1],
		[1, 1, r2], [1, -1, r2],
	];

	var pathFound = false;

	while (!pq.isEmpty()) {
		const [dist, row, col, prevDirection] = pq.pop();

		if (visited[row][col]) continue;
		visited[row][col] = true;

		if (row === end_row && col === end_column) {
			pathFound = true;
			break;
		}

		for (const [dRow, dCol, coeffDistance] of directions) {
			const newRow = row + dRow;
			const newCol = col + dCol;

			if (newRow >= 0 && newRow < heightGRID.value && newCol >= 0 && newCol < widthGRID.value && !visited[newRow][newCol]) {
				var newDist = dist + GRID[newRow][newCol]*coeffDistance;
				const newDirection = [dRow, dCol];

				if (prevDirection && (prevDirection[0] !== newDirection[0] || prevDirection[1] !== newDirection[1])) {
						newDist += 1; // Penalty for changing direction
				} else {
						newDist -= 0.5; // Reward for continuing in the same direction
				}

				if (newDist < distance[newRow][newCol]) {
					distance[newRow][newCol] = newDist;
					parent[newRow][newCol] = [row, col, newDirection];
					pq.push([newDist, newRow, newCol, newDirection]);
				}
			}
		}
	}

	if (!pathFound) return null;

	var curRow = end_row;
	var curCol = end_column;
	var curDirection = [0, 0];
	var prevDirection;

	while (curRow !== null && curCol !== null) {
		if (parent[curRow][curCol]) prevDirection=parent[curRow][curCol][2];
		else prevDirection=[0, 0];

		if (curDirection[0] !== prevDirection[0] || curDirection[1] !== prevDirection[1]) {
			path.push([Math.round((curCol+0.5) * tailleCarré), Math.round((curRow+0.5) * tailleCarré), distance[curRow][curCol]]);
		}

		[curRow, curCol, curDirection] = parent[curRow][curCol] || [null, null, null];
	}

	path.push([start_x, start_y, 0])

	path.reverse();

	return path;
}



async function createAnimation(start_x, start_y, end_x, end_y, rotationDeg, duration, animRobot, showPath, ctx, ctx_temp, reverse) {
	if (animRobot) {
		const canvas_path = document.getElementById('canvas_path'); // offsets are set to 0 when the component is cached
		const diff = canvas_path.width / canvas_path.offsetWidth;
		robot.value.style.transition = `left linear ${duration}ms, top linear ${duration}ms, transform linear 500ms`;
		await nextTick();
		robot.value.style.top = `${end_y / diff / canvas_path.offsetHeight * 100}%`;
		robot.value.style.left = `${end_x / diff / canvas_path.offsetWidth * 100}%`;

		var curDeg = 0;
		if (robot.value.style.transform) {
			curDeg = parseFloat(robot.value.style.transform.split('rotate(')[1].split('deg')[0]);
		}

		var curDegNormalized = curDeg % 360;
		if (curDegNormalized < 0) {
			curDegNormalized += 360;
		}

		var rotationDegNormalized = rotationDeg % 360;
		if (rotationDegNormalized < 0) {
			rotationDegNormalized += 360;
		}

		const clockwiseDiff = (rotationDegNormalized - curDegNormalized + 360) % 360;
		const counterClockwiseDiff = (curDegNormalized - rotationDegNormalized + 360) % 360;

		var newDeg;
		if (clockwiseDiff <= counterClockwiseDiff) {
			newDeg = curDeg + clockwiseDiff;
		} else {
			newDeg = curDeg - counterClockwiseDiff;
		}
		robot.value.style.transform = `translate(-50%, -50%) rotate(${newDeg}deg)`;
		//console.log('animation robot : ', props.flagLive, end_y / diff / containerButtons.value.offsetHeight * 100, end_x / diff / containerButtons.value.offsetWidth * 100, newDeg)
	}

	if (!showPath) return;

	const dx = end_x - start_x;
	const dy = end_y - start_y;

	const startTime = performance.now();
	curLineStart.value = [start_x, start_y];
	curLineEnd.value = [end_x, end_y];
	curLineDuration.value = duration;

	function animate(currentTime) {
		const animationTime = duration;
		const elapsedTime = currentTime - startTime;
		const progress = Math.min(elapsedTime / animationTime, 1);
		curLineProgress.value = progress;

		const newX = start_x + dx * progress;
		const newY = start_y + dy * progress;

		ctx_temp.clearRect(0, 0, canvas_path.value.width, canvas_path.value.height);
		ctx_temp.beginPath();
		if (reverse) {
			ctx_temp.moveTo(newX, newY);
			ctx_temp.lineTo(end_x, end_y);
		} else {
			ctx_temp.moveTo(start_x, start_y);
			ctx_temp.lineTo(newX, newY);
		}

		ctx_temp.stroke();

		if (progress < 1) {
			if (duration) animLine.value.delete(anim);
			anim = requestAnimationFrame(animate);
			if (duration) animLine.value.add(anim)
		} else {
			if (!reverse) {
				ctx.beginPath();
				ctx.moveTo(start_x, start_y);
				ctx.lineTo(newX, newY);
				ctx.stroke();
			}
			//add_infos(src, dest)
			ctx_temp.clearRect(0, 0, canvas_path.value.width, canvas_path.value.height);
			if (duration) animLine.value.delete(anim);
		}
	}
	var anim = requestAnimationFrame(animate);
	if (duration) animLine.value.add(anim);
}



async function animatePath(path, index, prev_x, prev_y, duration, animRobot, showPath, showProjectedPath, ctx, ctx_temp) {
	const cur_x=path[index][0];
	const cur_y=path[index][1];
	const total_dist=path[path.length-1][2];
	const delta_dist=path[index][2]-path[index-1][2];
	const curDuration = duration*delta_dist/total_dist;
	//console.log(delta_dist, curDuration);


	var rotationDeg = 0;
	if (animRobot) {
		const dx = cur_x - prev_x;
		const dy = cur_y - prev_y;
		rotationDeg = Math.atan2(dy, dx)*180/Math.PI;
	}

	if (animRobot||showPath) {
		await createAnimation(prev_x, prev_y, cur_x, cur_y, rotationDeg, curDuration, animRobot, showPath, ctx, ctx_temp, false);
	}

	if (showProjectedPath) {
		ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);
	}

	if (index+1>=path.length) return;

	if (curDuration===0) {
		await animatePath(path, index+1, cur_x, cur_y, duration, animRobot, showPath, showProjectedPath, ctx, ctx_temp);
	} else {
		simulationTimer.value = setTimeout(() => {
			animatePath(path, index+1, cur_x, cur_y, duration, animRobot, showPath, showProjectedPath, ctx, ctx_temp);
		}, curDuration);
	}

	if (showProjectedPath) {
		await animatePath(path, index+1, cur_x, cur_y, 0, false, true, false, ctx_projectedPath, ctx_projectedPathTemp);
		await createAnimation(prev_x, prev_y, cur_x, cur_y, rotationDeg, curDuration, false, true, ctx_projectedPath, ctx_projectedPathTemp, true);
	}
}



async function startIntervalProjectedPath() {
	ctx_path.clearRect(0, 0, canvas_path.value.width, canvas_path.value.height);
	ctx_pathTemp.clearRect(0, 0, canvas_pathTemp.value.width, canvas_pathTemp.value.height);
	ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);
	ctx_projectedPathTemp.clearRect(0, 0, canvas_projectedPathTemp.value.width, canvas_projectedPathTemp.value.height);


	ctx_projectedPath.lineWidth = 2.5;
	ctx_projectedPath.strokeStyle = 'lightblue';
	ctx_projectedPathTemp.lineWidth = 2.5;
	ctx_projectedPathTemp.strokeStyle = 'lightblue';

	clearInterval(projectedPathInterval.value);
	projectedPathInterval.value = setInterval(() => {
		if (props.flagLive &&  DATA.get('id').has(destinationLive.value)) {
			ctx_projectedPath.clearRect(0, 0, canvas_projectedPath.value.width, canvas_projectedPath.value.height);

			const diff = canvas_path.value.width / canvas_path.value.offsetWidth;

			const start_x = robot.value.offsetLeft * diff;
			const start_y = robot.value.offsetTop * diff;

			const button_dest = document.getElementById(destinationLive.value);
			const dest_x = button_dest.offsetLeft * diff;
			const dest_y = button_dest.offsetTop * diff;

			const path = dijkstra(start_x, start_y, dest_x, dest_y);
			if (path) {
				animatePath(path, 1, start_x, start_y, 0, false, true, false, ctx_projectedPath, ctx_projectedPathTemp);
				ctx_projectedPathTemp.drawImage(canvas_projectedPath.value, 0, 0);
				simulationTimer.value=null;
			}
		}
	}, refreshRateProjectedPath)
}






onMounted(() => {
	ctx_MapAIP = canvas_MapAIP.value.getContext('2d');
	ctx_path = canvas_path.value.getContext('2d');
	ctx_pathTemp = canvas_pathTemp.value.getContext('2d');
	ctx_projectedPath = canvas_projectedPath.value.getContext('2d');
	ctx_projectedPathTemp = canvas_projectedPathTemp.value.getContext('2d');
	ctx_grid = canvas_grid.value.getContext('2d');
	renderMap();
})


async function renderMap() {
	await nextTick();

  // tell the backend that the vue element MapAIP has loaded
  ipcRenderer.send('MapAIP-vue-loaded');
}

</script>


<template>
	<div id="container_map">
		<div id="robot" ref="robot">
			<div id="triangleRobot">
				<div></div>
			</div>
			<div id="triangleCutter">
			</div>
			<div id="borderRobot">
				<div></div>
			</div>
		</div>
		<canvas id="canvas_MapAIP" ref="canvas_MapAIP"></canvas>
		<canvas id="canvas_path" ref="canvas_path" class="drawingCanvas"></canvas>
		<canvas id="canvas_pathTemp" ref="canvas_pathTemp" class="drawingCanvas"></canvas>
		<canvas id="canvas_projectedPath" ref="canvas_projectedPath" class="drawingCanvas"></canvas>
		<canvas id="canvas_projectedPathTemp" ref="canvas_projectedPathTemp" class="drawingCanvas"></canvas>
		<canvas id="canvas_grid" ref="canvas_grid" class="drawingCanvas"></canvas>
		<div id="containerButtons" ref="containerButtons"></div>
	</div>
</template>

<style scoped src="../styles/mapAIP.css"></style>
