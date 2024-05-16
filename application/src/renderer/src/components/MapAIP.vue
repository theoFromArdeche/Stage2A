<template>
  <canvas id="mapAIP" ref="mapCanvas"></canvas>
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
        console.log(interestPoints)
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

    function tailleEtTracer() {
      //ctx.clearRect(0, 0, canvas.width, canvas.height)

      const container = document.getElementById('container_map')

      container.querySelectorAll('button').forEach((btn) => btn.remove())

      canvas.width = 2560
      canvas.height = (maxPos.x * canvas.width) / maxPos.y

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
  }
}
</script>

<style scoped src="../styles/mapAIP.css"></style>
