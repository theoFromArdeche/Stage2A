function isDigit(charac) {
  for (let i = 0; i <= 9; i++) {
    if (charac == '' + i) {
      return true
    }
  }
  return false
}

const getCoords = (line) => {
  const coords = [0, 0, 0]
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

  return coords
}

const getCoordsFa = (line) => {
  const coords = [
    [0, 0], // Premier point
    [0, 0], // Deuxième point
    0 // Rotation
  ]
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
    for (const line of lines) {
      if (line.startsWith('Cairn:')) {
        if (line.includes('ForbiddenLine')) {
          forbiddenLines.push(getCoordsFl(line))
        } else if (line.includes('ForbiddenArea')) {
          forbiddenAreas.push(getCoordsFa(line))
        } else {
          interestPoints.push(getCoords(line))
        }
      }
    }
  } catch (err) {
    console.error('Error fetching file:', err)
  }
}

updateInfos().then(() => {
  console.log(forbiddenAreas, '\n\n\n', forbiddenLines, '\n\n\n', interestPoints)
  document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('mapCanvas')
    const ctx = canvas.getContext('2d')

    interestPoints.forEach((point) => {
      ctx.fillStyle = 'blue'
      ctx.beginPath()
      ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI)
      ctx.fill()
    })

    forbiddenLines.forEach((line) => {
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(line[0][0], line[0][1])
      ctx.lineTo(line[1][0], line[1][1])
      ctx.stroke()
      console.log('greg')
    })

    forbiddenAreas.forEach((area) => {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
      ctx.beginPath()
      ctx.rect(area[0][0], area[0][1], area[1][0] - area[0][0], area[1][1] - area[0][1])
      ctx.fill()
      ctx.strokeStyle = 'red'
      ctx.stroke()
    })
  })
})
