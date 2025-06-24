const canvas = document.getElementById("canvas");
const context = canvas.getContext('2d');
const lightningStrikeOffset = 5;
const lightningStrikeLength = 200;
const lightningBoltLength = 5;
const lightningThickness = 4;
let canvasHeight = () => canvas.height;
let canvasWidth = () => canvas.width;

const createVector = function(x, y) { return { x, y } }

const getRandomFloat = function(min, max) {
  const random = Math.random() * (max - min + 1) + min;
  return random;
}

const getRandomInteger = function(min, max) {
  return Math.floor(getRandomFloat(min, max)); 
}

const clearCanvas = function(x, y, height, width) {
  const rectX = x || 0;
  const rectY = y || 0;
  const rectHeight = height || canvasHeight();
  const rectWidth = width || canvasWidth();
  context.clearRect(rectX, rectY, rectWidth, rectHeight);
  context.beginPath();
}

const line = function(start, end, thickness, opacity) {
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.lineWidth = thickness;
  context.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
  context.shadowBlur = 30;
  context.shadowColor = "#bd9df2";
  context.stroke();
  context.closePath();
}

class Lightning {
  constructor(x1, y1, x2, y2, thickness, opacity) {
    this.start = createVector(x1, y1);
    this.end = createVector(x2, y2);
    this.thickness = thickness;
    this.opacity = opacity;
  }
  draw() {
    return line(this.start, this.end, this.thickness, this.opacity);
  }
  get [Symbol.toStringTag]() {
    return { start: this.start, end: this.end }
  }
}

const interval = 3000;
// const lightningStrikeOffset = 5;
// const lightningStrikeLength = 100;
// const lightningBoltLength = Math.random() * 10;
// const lightningThickness = 4;
let lightning = [];


const createLightning = function() {
  lightning = [];
  const currentCanvasHeight = canvasHeight()
  console.log('createLigtning:width', canvasWidth())
  let lightningX1 = getRandomInteger(2, canvasWidth() - 2);
  let lightningX2 = getRandomInteger(lightningX1 - lightningStrikeOffset, lightningX1 + lightningStrikeOffset);
  console.log('x1, x2', { lightningX1, lightningX2 })
  lightning[0] = new Lightning(lightningX1, 0, lightningX2, lightningBoltLength, lightningThickness, 1);
  let l = 0
  while (lightning[l].end.y < currentCanvasHeight) {
    l++
    let lastBolt = lightning[l - 1];
    let lx1 = lastBolt.end.x;
    let lx2 = getRandomInteger(lx1 - lightningStrikeOffset, lx1 + lightningStrikeOffset);
    lightning.push(new Lightning(
      lx1, 
      lastBolt.end.y, 
      lx2, 
      lastBolt.end.y + lightningBoltLength, 
      lastBolt.thickness, 
      lastBolt.opacity
    ));
  }
  console.log('0', lightning[0])
  console.log('1', lightning[1])
}


const setup = function() {
  createLightning();
  for (let i = 0 ; i < lightning.length ; i++) {
    lightning[i].draw();
  }
}

const animate = function() {
  clearCanvas();

  for (let i = 0 ; i < lightning.length ; i++) {
    lightning[i].opacity -= 0.01;
    lightning[i].thickness -= 0.05;
    if (lightning[i].thickness <= 2) {
      lightning[i].end.y -= 0.05;
    }
    lightning[i].draw();
  }

  requestAnimationFrame(animate);
}

window.addEventListener('load', (event) => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  setup();
  requestAnimationFrame(animate);
  setInterval(function() {
    createLightning();
  }, interval)
})
