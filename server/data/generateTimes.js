const { Heap } = require('heap-js');
const fs = require('fs');
const { connectToDatabase, getDatabase, disconnectDatabase }  = require('./database');





var lineDetectedCoords = [];
var pointDetectedCoords = [];
var forbiddenLines = [];
var forbiddenAreas = [];
var interestPoints = [];
var minPos = { x: 0, y: 0 };
var maxPos = { x: 0, y: 0 };



const RING_SIZE = 3;
const tailleCarré = 4;
const distanceWeight = 4;
const dangerDistance = 56;
// 1 pixel = 14/25 cm and the distance in MobilePlaner is 100cm (PlanFreeSpace) so we need 56px
// (the pixels are from the canvas that is set with a width of 2560)
var GRID = null;
var heightGRID = null;
var widthGRID = null;
var canvas_width;
var canvas_height;


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
  return match[1].toLowerCase();
}



function rotate(x, y, angleDegrees) {
  const angleRadians = angleDegrees * Math.PI / 180;
  const cosTheta = Math.cos(angleRadians);
  const sinTheta = Math.sin(angleRadians);

  const xPrime = x * cosTheta - y * sinTheta;
  const yPrime = x * sinTheta + y * cosTheta;

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
  const originalCoords = coords.slice(0, 2).map(([x, y]) => rotate(x, y, heading));

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

		if (row >= 0 && row < heightGRID && column >= 0 && column < widthGRID) {
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
	if (GRID[row][column] === Infinity) return;
	GRID[row][column] = Infinity;

	const distCells = Math.ceil(dangerDistance/tailleCarré);
	for (let deltaRow = -distCells; deltaRow <= distCells; deltaRow++) {
		for (let deltaColumn = -distCells; deltaColumn <= distCells; deltaColumn++) {
			const newRow = row + deltaRow;
			const newCol = column + deltaColumn;

			if (newRow >= heightGRID || newCol >= widthGRID || newRow < 0 || newCol < 0) continue;

			const distance = Math.sqrt((deltaRow + 0.5)**2 + (deltaColumn + 0.5)**2) * tailleCarré;
			if (distance > dangerDistance) continue;

			// Linear interpolation from distanceWeight to 1 based on the distance
			const weight = distanceWeight - ((distanceWeight - 1) / dangerDistance) * distance;
			GRID[newRow][newCol] = Math.max(GRID[newRow][newCol], weight);
		}
	}
}

function calcRotatedCoords(row, col, centerX, centerY, rotationDeg) {
	const cellCenterX = (col + 0.5) * tailleCarré;
	const cellCenterY = (row + 0.5) * tailleCarré;
	const [xWithAngle, yWithAngle] = rotate(cellCenterX - centerX, cellCenterY - centerY, rotationDeg);
	const newX = xWithAngle + centerX;
	const newY = yWithAngle + centerY;
	const newRow = Math.floor(newY / tailleCarré);
	const newColumn = Math.floor(newX / tailleCarré);
	return [newRow, newColumn]
}



function tailleEtTracer() {
	canvas_width = 2560;
	canvas_height = (maxPos.x * canvas_width) / maxPos.y;


	widthGRID =  Math.ceil(canvas_width/tailleCarré)+1;
	heightGRID = Math.ceil(canvas_height/tailleCarré)+1;
	GRID = Array.from({ length: heightGRID }, () => Array(widthGRID).fill(1));
	//console.log(heightGRID, widthGRID);


	pointDetectedCoords.forEach((point) => {
		const transformed = transformCoord(point[0], point[1], canvas_width)

		const row = Math.floor(transformed.y/tailleCarré);
		const column = Math.floor(transformed.x/tailleCarré);
		dangerCalc(row, column);
	})

	forbiddenLines.forEach((line) => {
		const start = transformCoord(line[0][0], line[0][1], canvas_width)
		const end = transformCoord(line[1][0], line[1][1], canvas_width)

		bresenham(start.x, start.y, end.x, end.y);
	})

	forbiddenAreas.forEach((area) => {
		const { originalCoords, heading } = area;

		const rotationDeg = heading === 0 ? 0 : 270 - heading;

		const bottomRight = transformCoord(originalCoords[0][0], originalCoords[0][1], canvas_width);
		const topLeft = transformCoord(originalCoords[1][0], originalCoords[1][1], canvas_width);

		const centerX = (bottomRight.x + topLeft.x) / 2;
		const centerY = (bottomRight.y + topLeft.y) / 2;

		const leftRow = Math.floor(topLeft.y / tailleCarré);
    const rightRow = Math.floor(bottomRight.y / tailleCarré);
    const leftCol = Math.floor(topLeft.x / tailleCarré);
    const rightCol = Math.floor(bottomRight.x / tailleCarré);

    for (let row = Math.min(leftRow, rightRow); row <= Math.max(leftRow, rightRow); row++) {
			for (let column = Math.min(leftCol, rightCol); column <= Math.max(leftCol, rightCol); column++) {
				if (row < 0 || row >= heightGRID || column < 0 || column >= widthGRID) continue;
				const [rotatedRow, rotatedColumn] = calcRotatedCoords(row, column, centerX, centerY, rotationDeg)

				if (rotatedRow < 0 || rotatedRow >= heightGRID || rotatedColumn < 0 || rotatedColumn >= widthGRID) continue;

				for (let [deltaRow, deltaColumn] of [[1, 0], [0, 0], [-1, 0]]) {
					if (rotatedRow+deltaRow>=heightGRID||rotatedColumn+deltaColumn>=widthGRID||rotatedRow+deltaRow<0||rotatedColumn+deltaColumn<0) continue;
					const [neighbourRow, neighbourColumn] = calcRotatedCoords(rotatedRow+deltaRow, rotatedColumn+deltaColumn, centerX, centerY, -rotationDeg)

					if (neighbourRow < Math.min(leftRow, rightRow) || neighbourRow > Math.max(leftRow, rightRow) ||
							neighbourColumn < Math.min(leftCol, rightCol) || neighbourColumn > Math.max(leftCol, rightCol)) continue;

					dangerCalc(rotatedRow+deltaRow, rotatedColumn+deltaColumn);
				}
			}
    }
	})

	lineDetectedCoords.forEach((line) => {
		const start = transformCoord(line[0][0], line[0][1], canvas_width);
		const end = transformCoord(line[1][0], line[1][1], canvas_width);

		bresenham(start.x, start.y, end.x, end.y);
	})
}






function dijkstra(start_x, start_y, end_x, end_y) {
	if (!heightGRID || !widthGRID) return -2;

	const start_row = Math.floor(start_y / tailleCarré);
	const start_column = Math.floor(start_x / tailleCarré);
	const end_row = Math.floor(end_y / tailleCarré);
	const end_column = Math.floor(end_x / tailleCarré);

	if (start_row >= heightGRID || start_row < 0 || start_column >= widthGRID || start_column < 0 ||
		end_row >= heightGRID || end_row < 0 || end_column >= widthGRID || end_column < 0) {
		return -1;
	}

	if (start_row === end_row && start_column === end_column) {
		return 0;
	}

	const distance = Array.from({ length: heightGRID }, () => Array(widthGRID).fill(Infinity));
	const parent = Array.from({ length: heightGRID }, () => Array(widthGRID).fill(null));
	const visited = Array.from({ length: heightGRID }, () => Array(widthGRID).fill(false));

	distance[start_row][start_column] = 0;

	const pq = new Heap((a, b) => a[0] - b[0]);
	pq.push([0, start_row, start_column, null]);

	const directions = [];
	const numDirections = RING_SIZE * 8;
	const step = (2 * Math.PI) / numDirections;

	for (let i = 0; i < numDirections; i++) {
		const angle = i * step;
		const dRow = Math.round(RING_SIZE * Math.cos(angle));
		const dCol = Math.round(RING_SIZE * Math.sin(angle));
		const coeffDistance = Math.sqrt(dRow * dRow + dCol * dCol);
		directions.push([dRow, dCol, coeffDistance]);
	}

	let pathFound = false;
	var pathDist = -1;

	while (!pq.isEmpty()) {
		const [dist, row, col, prevDirection] = pq.pop();

		if (visited[row][col]) continue;
		visited[row][col] = true;

		if (row === end_row && col === end_column) {
			pathFound = true;
			pathDist = dist;
			break;
		}

		for (const [dRow, dCol, coeffDistance] of directions) {
			const newRow = row + dRow;
			const newCol = col + dCol;

			if (newRow >= 0 && newRow < heightGRID && newCol >= 0 && newCol < widthGRID && !visited[newRow][newCol]) {
				let validPath = true;
				let totalWeight = 0;
				let count = 0;

				for (let i = 0; i <= RING_SIZE; i++) {
					const intermediateRow = Math.round(row + i * (dRow / RING_SIZE));
					const intermediateCol = Math.round(col + i * (dCol / RING_SIZE));

					if (intermediateRow < 0 || intermediateRow >= heightGRID || intermediateCol < 0 || intermediateCol >= widthGRID || GRID[intermediateRow][intermediateCol] === Infinity) {
						validPath = false;
						break;
					}
					totalWeight += GRID[intermediateRow][intermediateCol];
					count++;
				}

				if (!validPath) continue;

				let newDist = dist + (totalWeight / count) * coeffDistance;
				const newDirection = [dRow, dCol];

				if (prevDirection) {
					let angleChange = Math.abs(Math.atan2(newDirection[1], newDirection[0]) - Math.atan2(prevDirection[1], prevDirection[0]));
					if (angleChange > Math.PI) {
						angleChange = 2 * Math.PI - angleChange;
					}

					// Penalize sharp turns and reward smoother turns, ensuring no negative distances
					if (angleChange > Math.PI / 2) {
						newDist += 3; // High penalty for sharp turns
					} else if (angleChange > Math.PI / 4) {
						newDist += 1; // Moderate penalty for medium turns
					} else {
						newDist += 0; // No reward for smooth turns to avoid negative distances
					}
				}

				if (newDist < distance[newRow][newCol]) {
					distance[newRow][newCol] = newDist;
					parent[newRow][newCol] = [row, col, newDirection];
					pq.push([newDist, newRow, newCol, newDirection]);
				}
			}
		}
	}

	return pathDist;
}



function dijkstraTEST(start_x, start_y, end_x, end_y) {
	if (!heightGRID||!widthGRID) return null;

	const path = [];
	const start_row = Math.floor(start_y / tailleCarré);
	const start_column = Math.floor(start_x / tailleCarré);
	const end_row = Math.floor(end_y / tailleCarré);
	const end_column = Math.floor(end_x / tailleCarré);

	if (start_row>=heightGRID||start_row<0||start_column>=widthGRID||start_column<0||
			end_row>=heightGRID||end_row<0||end_column>=widthGRID||end_column<0) {
			return -1;
	}

	if (start_row===end_row&&start_column===end_column) {
		return 0;
	}


	const distance = Array.from({ length: heightGRID }, () => Array(widthGRID).fill(Infinity));
	const parent = Array.from({ length: heightGRID }, () => Array(widthGRID).fill(null));
	const visited = Array.from({ length: heightGRID }, () => Array(widthGRID).fill(false));

	distance[start_row][start_column] = 0;

	const pq = new Heap((a, b) => a[0] - b[0]);
	pq.push([0, start_row, start_column, null, 0]);

	const r2 = Math.sqrt(2);

	const directions = [ // delta row, delta column, coeff distance
		[1, 0, 1], [-1, 0, 1],
		[1, 1, r2], [-1, 1, r2],
		[0, 1, 1], [0, -1, 1],
		[1, 1, r2], [1, -1, r2],
	];

	var pathFound = false;
	var pathRealDist = -1;

	while (!pq.isEmpty()) {
		const [dist, row, col, prevDirection, realDist] = pq.pop();

		if (visited[row][col]) continue;
		visited[row][col] = true;

		if (row === end_row && col === end_column) {
			pathFound = true;
			pathRealDist = realDist;
			break;
		}

		for (const [dRow, dCol, coeffDistance] of directions) {
			const newRow = row + dRow;
			const newCol = col + dCol;

			if (newRow >= 0 && newRow < heightGRID && newCol >= 0 && newCol < widthGRID && !visited[newRow][newCol]) {
				var newDist = dist + GRID[newRow][newCol]*coeffDistance;
				const newDirection = [dRow, dCol];
				const newRealDist = realDist + coeffDistance;

				if (prevDirection && (prevDirection[0] !== newDirection[0] || prevDirection[1] !== newDirection[1])) {
					newDist += 1; // Penalty for changing direction
				} else {
					newDist -= 0.5; // Reward for continuing in the same direction
				}

				if (newDist < distance[newRow][newCol]) {
					distance[newRow][newCol] = newDist;
					parent[newRow][newCol] = [row, col, newDirection];
					pq.push([newDist, newRow, newCol, newDirection, newRealDist]);
				}
			}
		}
	}


	return pathRealDist;
}














const robotId = '127-0-0-1_3456';
const src = 's-114';
const dest = 's-106';
const time  = 25;


function init() {
	const mapData = fs.readFileSync(`./map_${robotId}.txt`, 'utf8');
	if (!mapData) {
		console.error('Map could not be loaded');
		return;
	}

	connectToDatabase(async error => {
		if (error) {
			console.log('Could not connect to the database');
		} else {
			const database = getDatabase();
			main(database, mapData);
		}
	})
}

init();


async function main(database, mapData) {

	updateInfos(mapData);
	tailleEtTracer();

	var startCoords, endCoords;
	interestPoints.forEach((point, i) => {
		if (point[3]===src) startCoords = [point[0], point[1]];
		else if (point[3]===dest) endCoords = [point[0], point[1]];
	})

	if (!startCoords || !endCoords) {
		console.log('Did not find the src and dest points in the interestPoints array');
		return;
	}

	const start = transformCoord(startCoords[0], startCoords[1], canvas_width);
	const end = transformCoord(endCoords[0], endCoords[1], canvas_width);

	const ratio = time / dijkstra(start.x, start.y, end.x, end.y);

	var nbCalc = 0;
	console.log(interestPoints.length);
	for (let i=0; i<interestPoints.length; i++) {
		const startPoint = interestPoints[i];
		const start = transformCoord(startPoint[0], startPoint[1], canvas_width);
		await database.collection(`times_${robotId}`).findOne({label: startPoint[3]}).then(doc => {
			for (let j=0; j<interestPoints.length; j++) {
				const endPoint = interestPoints[j];
				const end = transformCoord(endPoint[0], endPoint[1], canvas_width);
				const dist = dijkstra(start.x, start.y, end.x, end.y);
				if (dist === -1) {
					console.log('NO PATH:', startPoint[3], endPoint[3]);
					continue;
				}
				nbCalc++;
				const newTime = Math.round(dist * ratio);
				console.log(nbCalc, startPoint[3], endPoint[3], newTime);
				doc.times[endPoint[3]]=newTime;
			};
			database.collection(`times_${robotId}`).updateOne(
				{_id: doc._id},
				{$set: {times: doc.times}}
			);
		});
	};

	setTimeout(disconnectDatabase, 5 * 1000);
}
