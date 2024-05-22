<script setup>
import { ref, onMounted } from 'vue'

var data;

const ipcRenderer = window.electron.ipcRenderer;


ipcRenderer.on('updateData', (event, arg) => {
  data = arg;
  console.log(data)
});


const mapCanvas = ref(null)

function isDigit(charac) {
  for (let i = 0; i <= 9; i++) {
    if (charac == '' + i) {
      return true
    }
  }
  return false
}

const getCoords = (line) => {
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

const getCoordsFa = (line) => {
  const coords = [[0, 0], [0, 0], 0]
  let compteur = 0
  let i = 0
  let temp = ''

  while (compteur <= 6 && i < line.length) {
    if (line[i] === '-' || (line[i] === '.' && isDigit(line[i + 1])) || isDigit(line[i])) {
      temp += line[i]
    }
    if ((temp !== '' && line[i] === ' ') || i === line.length - 1) {
      switch (compteur) {
        case 2:
          coords[2] = parseFloat(temp)
          break
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

const getCoordsFl = (line) => {
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

let lineDetectedCoords = []
let pointDetectedCoords = []
let forbiddenLines = []
let forbiddenAreas = []
let interestPoints = []

const updateInfos = async () => {
  const url =
    'https://raw.githubusercontent.com/PIDR-2023/PIDR/requetes/server/map_loria.txt'
  try {
    const response = await fetch(url)
    const content = await response.text()
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
  } catch (err) {
    console.error('Error fetching file:', err)
  }
}

var minPos = { x: 0, y: 0 }
var maxPos = { x: 0, y: 0 }

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
  maxPos.x -= minPos.x
  maxPos.y -= minPos.y
}



onMounted(async () => {
  // tell the backend that the vue has loaded
  ipcRenderer.send('vue-loaded');

  const canvas_MapAIP = document.getElementById('canvas_MapAIP')
  const ctx_MapAIP = canvas_MapAIP.getContext('2d')
  const canvas_route = document.getElementById("canvas_route");
  const ctx_route = canvas_route.getContext('2d');
  const canvas_transition = document.getElementById("canvas_transition");
  const ctx_transition = canvas_transition.getContext('2d');

  function tailleEtTracer() {
    //ctx.clearRect(0, 0, canvas.width, canvas.height)

    

    const container_map = document.getElementById('container_map')

    canvas_MapAIP.width = 2560
    canvas_MapAIP.height = (maxPos.x * canvas_MapAIP.width) / maxPos.y
    canvas_route.width = canvas_MapAIP.width
    canvas_route.height = canvas_MapAIP.height
    canvas_transition.width = canvas_MapAIP.width
    canvas_transition.height = canvas_MapAIP.height

    function transformCoord(x, y, width) {
      const diff = width / maxPos.y
      //if ((1 - (y - minPos.y) / maxPos.y)*width<350) console.log((1 - (y - minPos.y) / maxPos.y) * width, x, y)
      return {
        x: (1 - (y - minPos.y) / maxPos.y) * width,
        y: (maxPos.x - x + minPos.x) * diff
      }
    }

    pointDetectedCoords.forEach((point) => {
      const transformed = transformCoord(point[0], point[1], canvas_MapAIP.width)
      ctx_MapAIP.fillStyle = 'blue'
      ctx_MapAIP.beginPath()
      ctx_MapAIP.arc(transformed.x, transformed.y, 0.5, 0, 2 * Math.PI)
      ctx_MapAIP.fill()
    })

    interestPoints.forEach((point) => {
      const transformed = transformCoord(point[0], point[1], container_map.offsetWidth)
      const button = document.createElement('button')
      const text_bouton = document.createElement('p')
      text_bouton.innerText = point[3]
      text_bouton.style.opacity = 0
      button.style.position = 'absolute'
      text_bouton.style.position = 'absolute'
      button.style.width = '1%'
      button.style.left = `${Math.round((transformed.x / container_map.offsetWidth) * 100)}%`
      text_bouton.style.left = `${Math.round((transformed.x / container_map.offsetWidth) * 100)}%`
      const container_height = (maxPos.x * container_map.offsetWidth) / maxPos.y
      button.style.top = `${Math.round((transformed.y / container_height) * 100)}%`
      text_bouton.style.top = `${Math.round((transformed.y / container_height) * 100)}%`
      button.id = point[3]
      button.onclick = function(){text_bouton.style.opacity = 1 - text_bouton.style.opacity}
      container_map.appendChild(button)
      container_map.appendChild(text_bouton)
    })

    forbiddenLines.forEach((line) => {
      const start = transformCoord(line[0][0], line[0][1], canvas_MapAIP.width)
      const end = transformCoord(line[1][0], line[1][1], canvas_MapAIP.width)
      ctx_MapAIP.strokeStyle = 'red'
      ctx_MapAIP.lineWidth = 2
      ctx_MapAIP.beginPath()
      ctx_MapAIP.moveTo(start.x, start.y)
      ctx_MapAIP.lineTo(end.x, end.y)
      ctx_MapAIP.stroke()
    })

    forbiddenAreas.forEach((area) => {
      const topLeft = transformCoord(area[0][0], area[0][1], canvas_MapAIP.width)
      const bottomRight = transformCoord(area[1][0], area[1][1], canvas_MapAIP.width)
      ctx_MapAIP.fillStyle = 'rgba(255, 0, 0, 0.5)'
      ctx_MapAIP.beginPath()
      ctx_MapAIP.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
      ctx_MapAIP.fill()
      ctx_MapAIP.strokeStyle = 'red'
      ctx_MapAIP.stroke()
    })

    lineDetectedCoords.forEach((line) => {
      const start = transformCoord(line[0][0], line[0][1], canvas_MapAIP.width)
      const end = transformCoord(line[1][0], line[1][1], canvas_MapAIP.width)
      ctx_MapAIP.strokeStyle = 'purple'
      ctx_MapAIP.lineWidth = 1
      ctx_MapAIP.beginPath()
      ctx_MapAIP.moveTo(start.x, start.y)
      ctx_MapAIP.lineTo(end.x, end.y)
      ctx_MapAIP.stroke()
    })
  }

  updateInfos().then(() => {
    tailleEtTracer()
  })

  //window.addEventListener('resize', tailleEtTracer)
  function clearCanvas() {
    ctx_transition.clearRect(0, 0, canvas_transition.width, canvas_transition.height); //à modifier si les tout les canvas ne seront plus de la meme taille
  }

  function animateLineBetweenButtons(button_id_start, button_id_end) {
    if (!data.id.has(button_id_start)||!data.id.has(button_id_end)) return;
    // Récupère les références des deux boutons et du canvas
    const button_start = document.getElementById(button_id_start);
    const button_end = document.getElementById(button_id_end);

    // Vérifie que les deux boutons et le canvas existent
    if (!button_start || !button_end || !canvas_route || !ctx_route) {
      console.error(`Un ou plusieurs éléments n'ont pas été trouvés : ${button_id_start}, ${button_id_end}, #canvas_route`);
      return;
    }

    // Récupère les positions des deux boutons (par rapport au conteneur)
    const diff = canvas_route.width / canvas_route.offsetWidth

    const x1 = button_start.offsetLeft * diff
    const y1 = button_start.offsetTop * diff
    const x2 = button_end.offsetLeft * diff
    const y2 = button_end.offsetTop * diff
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Propriétés de la ligne
    const liste = ["rgb(255, 0, 0)", "rgb(253, 36, 0)", "rgb(251, 53, 0)", "rgb(249, 67, 0)", "rgb(246, 79, 0)", "rgb(243, 89, 0)", "rgb(240, 98, 0)", "rgb(236, 108, 0)", "rgb(231, 117, 0)", "rgb(226, 125, 0)", "rgb(221, 132, 0)", "rgb(216, 139, 0)", "rgb(211, 146, 0)", "rgb(205, 153, 0)", "rgb(200, 159, 0)", "rgb(194, 165, 0)", "rgb(188, 170, 0)", "rgb(181, 176, 0)", "rgb(175, 181, 0)", "rgb(168, 187, 0)", "rgb(161, 192, 0)", "rgb(153, 197, 0)", "rgb(144, 202, 0)", "rgb(135, 207, 0)", "rgb(124, 212, 0)", "rgb(111, 217, 0)", "rgb(96, 222, 0)", "rgb(80, 226, 0)", "rgb(59, 231, 0)", "rgb(19, 235, 15)"]
    ctx_route.lineWidth = 10;
    ctx_transition.lineWidth = 10;
    ctx_route.lineCap = 'round';
    ctx_transition.lineCap = 'round';
    const success_rate = Math.floor(liste.length*data.successes[data.id.get(button_id_start)][data.id.get(button_id_end)]/(data.successes[data.id.get(button_id_start)][data.id.get(button_id_end)] + data.fails[data.id.get(button_id_start)][data.id.get(button_id_end)]))
    ctx_route.strokeStyle = liste[success_rate];
    ctx_transition.strokeStyle = liste[success_rate];

    // Animation
    let startTime = performance.now();

    function animate(currentTime) {
      // Avancement du robot
      const speedup = 1
      const animationTime = data.times[data.id.get(button_id_start)][data.id.get(button_id_end)]*1000/speedup
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / animationTime, 1);

      // Calcule la nouvelle position du trait
      const newX = x1 + dx * progress;
      const newY = y1 + dy * progress;

      // Efface le canvas et dessine le nouveau trait
      ctx_transition.clearRect(0, 0, canvas_transition.width, canvas_transition.height);
      ctx_transition.beginPath();
      ctx_transition.moveTo(x1, y1);
      ctx_transition.lineTo(newX, newY);
      ctx_transition.stroke();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ctx_route.beginPath();
        ctx_route.moveTo(x1, y1);
        ctx_route.lineTo(newX, newY);
        ctx_route.stroke();
        setTimeout(clearCanvas, 500)
      }
    }

    // Démarre l'animation
    requestAnimationFrame(animate);
  }

  // Exemple d'utilisation de la fonction :
  document.addEventListener('keydown', function (event) {
    if (event.code === 'Space') {
      animateLineBetweenButtons('S-111-2', 'Sfp_Poste4')
    }
    else if (event.key === 'p') {
      animateLineBetweenButtons('S-106', 'S-111-2')
    }
    else if (event.key === 'c') {
      ctx_route.clearRect(0, 0, canvas_route.width, canvas_route.height);
    }
  });
})
</script>


<template>
  <canvas id="canvas_MapAIP"></canvas>
  <canvas id="canvas_route"></canvas>
  <canvas id="canvas_transition"></canvas>
</template>

<style scoped src="../styles/mapAIP.css"></style>
