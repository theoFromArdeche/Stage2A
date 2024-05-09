import { forbiddenLines, forbiddenAreas, interestPoints } from './traitement_map.js'

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
