<template>
  <canvas id="mapAIP" ref="mapCanvas"></canvas>
  <canvas id = "canvas2"></canvas>
</template>

<script>
export default {
  name: 'MapAIP',
  mounted() {
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
        'https://raw.githubusercontent.com/PIDR-2023/PIDR/traitement_map/application/map_loria.txt'
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

    const canvas = document.getElementById('mapAIP')
    const ctx = canvas.getContext('2d')
    const canvas2 = document.getElementById("canvas2");
    const ctx2 = canvas2.getContext('2d');

    function tailleEtTracer() {
      //ctx.clearRect(0, 0, canvas.width, canvas.height)

      const container = document.getElementById('container_map')
      console.log(container.width, container.height)
      container.querySelectorAll('button').forEach((btn) => btn.remove())

      canvas.width = 2560
      canvas2.width = 2560
      canvas.height = (maxPos.x * canvas.width) / maxPos.y
      canvas2.height = (maxPos.x * canvas2.width) / maxPos.y
      console.log(`maxPos ici ${maxPos.x, maxPos.y}`)
      function transformCoord(x, y, width) {
        const diff = width / maxPos.y
        return {
          x: (1 - (y - minPos.y) / maxPos.y) * width,
          y: (maxPos.x - x + minPos.x) * diff
        }
      }

      pointDetectedCoords.forEach((point) => {
        const transformed = transformCoord(point[0], point[1], canvas.width)
        ctx.fillStyle = 'blue'
        ctx.beginPath()
        ctx.arc(transformed.x, transformed.y, 0.5, 0, 2 * Math.PI)
        ctx.fill()
      })

      interestPoints.forEach((point) => {
        const transformed = transformCoord(point[0], point[1], container.offsetWidth)
        const button = document.createElement('button')
        button.style.position = 'absolute'
        button.style.width = '1%'
        button.style.left = `${Math.round((transformed.x / container.offsetWidth) * 100)}%`
        const container_height = (maxPos.x * container.offsetWidth) / maxPos.y
        button.style.top = `${Math.round((transformed.y / container_height) * 100)}%`
        button.id = point[3]
        button.onclick = () => console.log(button.id)
        container.appendChild(button)
      })

      forbiddenLines.forEach((line) => {
        const start = transformCoord(line[0][0], line[0][1], canvas.width)
        const end = transformCoord(line[1][0], line[1][1], canvas.width)
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
      })

      forbiddenAreas.forEach((area) => {
        const topLeft = transformCoord(area[0][0], area[0][1], canvas.width)
        const bottomRight = transformCoord(area[1][0], area[1][1], canvas.width)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
        ctx.beginPath()
        ctx.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
        ctx.fill()
        ctx.strokeStyle = 'red'
        ctx.stroke()
      })

      lineDetectedCoords.forEach((line) => {
        const start = transformCoord(line[0][0], line[0][1], canvas.width)
        const end = transformCoord(line[1][0], line[1][1], canvas.width)
        ctx.strokeStyle = 'purple'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
      })
    }

    updateInfos().then(() => {
      tailleEtTracer()
    })

    //window.addEventListener('resize', tailleEtTracer)
    function clearCanvas(){
      //canvas2.style.display = 'none'
      ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
      console.log(canvas2.width, canvas2.height)
    }

    function animateLineBetweenButtons(buttonId1, buttonId2) {
      // Récupère les références des deux boutons et du canvas
      console.log("je passe la 1")
      const button1 = document.getElementById(buttonId1);
      const button2 = document.getElementById(buttonId2);
      
      //const canvas = document.getElementById("mapAIP");
      
      console.log(`maxpos : ${maxPos.x}`)
      canvas2.width = canvas.width
      canvas2.height = canvas.height
      // Vérifie que les deux boutons et le canvas existent
      if (!button1 || !button2 || !canvas2 || !ctx2) {
        console.error(`Un ou plusieurs éléments n'ont pas été trouvés : ${buttonId1}, ${buttonId2}, #canvas2`);
        return;
      }

      // Récupère les positions des deux boutons (par rapport au conteneur)
      const rect1 = button1.getBoundingClientRect();
      const container = document.getElementById('container_map')
      const test1 = parseFloat(button1.style.left)*(container.offsetWidth)/100
      const test2 = parseFloat(button2.style.left)*(container.offsetWidth)/100
      console.log(rect)
      const rect2 = button2.getBoundingClientRect();
      const containerRect = canvas2.getBoundingClientRect();
      
      const x1 = test1//rect1.left - containerRect.left;
      const y1 = rect1.top - containerRect.top;
      const x2 = rect2.left - containerRect.left;
      const y2 = rect2.top - containerRect.top;
      
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx**2 + dy**2);
      const angle = Math.atan2(dy, dx);

      ctx2.fillStyle = 'red';
      

      // Propriétés de la ligne
      ctx2.lineWidth = 10;
      ctx2.lineCap = 'round';
      ctx2.strokeStyle = 'green';

      // Animation
      let startTime = performance.now();

      function animate(currentTime) {
        
        /*
        console.log(button1.getBoundingClientRect())
        console.log(containerRect.left)
        */
        //Avancement de l'application (ici pour 5s)
        const animationTime = 5000
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / animationTime, 1);

        // Calcule la nouvelle position du trait
        const newX = x1 + dx * progress;
        const newY = y1 + dy * progress;

        // Efface le canvas et dessine le nouveau trait
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
        ctx2.beginPath();
        ctx2.moveTo(x1, y1);
        ctx2.lineTo(newX, newY);
        ctx2.stroke();
        ctx2.fillRect(x1,y1,10,10)
        ctx2.fillRect(x2,y2,10,10)

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(clearCanvas,3000)
        }
      }

      // Démarre l'animation
      requestAnimationFrame(animate);
    }

    // Exemple d'utilisation de la fonction :
    document.addEventListener('keydown', function(event) {
            if (event.code === 'Space'){
                console.log("Space key is pressed!");
                animateLineBetweenButtons('S-106', 'S-114')
            }
        });
  }
}
</script>

<style scoped src="../styles/mapAIP.css"></style>
