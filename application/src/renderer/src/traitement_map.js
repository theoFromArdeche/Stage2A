const { is } = require('@electron-toolkit/utils');
const fs = require('fs');
const path = require('path');

function isDigit(charac){
  for (let i = 0; i<=9; i++){
    if (charac == '' + i){
      return true
    }
  }
  return false
}
console.log(isDigit('9'))
console.log(isDigit('90'))

const getCoords = line => {
    const coords = [0, 0, 0];
    let pointeur = 0;
    let i = 0;
    let temp = "";
  
    while (pointeur <= 2 && i < line.length) {
      if (
        line[i] === "-" ||
        (line[i] === "." && line[i + 1].isDigit()) ||
        line[i].isDigit()
      ) {
        temp += line[i];
      } else if (temp !== "" && line[i] === " ") {
        coords[pointeur] = parseFloat(temp);
        temp = "";
        pointeur += 1;
      }
      i += 1;
    }
  
    return coords;
  };
  
  const getCoordsFa = line => {
    const coords = [[[0, 0], [0, 0]], 0];
    let compteur = 0;
    let i = 0;
    let temp = "";
  
    while (compteur <= 6 && i < line.length) {
      if (
        line[i] === "-" ||
        (line[i] === "." && isDigit(line[i + 1])) ||
        isDigit(line[i])
      ) {
        temp += line[i];
      }
      if (temp !== "" && (line[i] === " " || i === line.length - 1)) {
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
        temp = "";
        compteur += 1;
      }
      i += 1;
    }
  
    return coords;
  };
  
  const getCoordsFl = line => {
    const coords = [[0, 0], [0, 0]];
    let compteur = 0;
    let i = 0;
    let temp = "";
  
    while (compteur <= 6 && i < line.length) {
      if (
        line[i] === "-" ||
        (line[i] === "." && line[i + 1].isDigit()) ||
        isDigit(line[i])
      ) {
        temp += line[i];
      }
      if (temp !== "" && (line[i] === " " || i === line.length - 1)) {
        switch (compteur) {
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
        temp = "";
        compteur += 1;
      }
      i += 1;
    }
  
    return coords;
  };
  
  const forbiddenLines = [];
  const forbiddenAreas = [];
  const interestPoints = [];



  const updateInfos = async () => {
    var content;
    fs.readFile(path.join(__dirname, 'map_loria.txt'), 'utf8', (err, content) => {
      if (err) {
        console.log("Error reading file:", err);
        return;
      }
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith("Cairn:")) {
          if (line.includes("ForbiddenLine")) {
            forbiddenLines.push(getCoordsFl(line));
          } else if (line.includes("ForbiddenArea")) {
            forbiddenAreas.push(getCoordsFa(line));
          } else {
            interestPoints.push(getCoords(line));
          }
        }
      }
    });
  };
  
  updateInfos()
    .then(() => {
      console.log(forbiddenAreas, "\n\n\n", forbiddenLines, "\n\n\n", interestPoints);
    })
    .catch(error => {
      console.error(error);
    });