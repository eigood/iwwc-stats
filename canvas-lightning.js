

/*
const canvas = document.getElementById("canvas");
const context = canvas.getContext('2d');
let canvasHeight = () => canvas.height;
let canvasWidth = () => canvas.width;
*/

const createVector = (x, y) => ({ x, y })
const getRandomFloat = (min, max) => Math.random() * (max - min) + min
const getRandomInteger = (min, max) => Math.floor(getRandomFloat(min, max))

class CanvasUtils {
  #canvas
  #context
  constructor(canvas) {
    this.#canvas = canvas
    this.#context = canvas.getContext('2d')
  }

  get context() {
    return this.#context
  }

  get height() {
    return this.#canvas.height
  }

  get width() {
    return this.#canvas.width
  }

  setSize(width, height) {
    this.#canvas.width = width
    this.#canvas.height = height
  }

  clearCanvas(x = 0, y = 0, h = this.width, w = this.height) {
    this.#context.clearRect(x, y, h, w)
    //context.beginPath();
  }
}

class Line {
  #start
  #end
  #thickness
  #opacity

  constructor(x1, y1, x2, y2, thickness, opacity) {
    this.#start = createVector(x1, y1)
    this.#end = createVector(x2, y2)
    this.#thickness = thickness
    this.#opacity = opacity
  }

  decay() {
    this.#opacity -= 0.01
    this.#thickness -= 0.05
    if (this.#thickness <= 2) {
      this.#end.y -= 0.05
    }
  }

  draw(utils) {
    const context = utils.context
    context.beginPath()
    context.moveTo(this.#start.x, this.#start.y)
    context.lineTo(this.#end.x, this.#end.y)
    context.lineWidth = this.#thickness
    context.strokeStyle = `rgba(255, 255, 255, ${this.#opacity})`
    context.shadowBlur = 30
    context.shadowColor = '#bd9df2'
    context.stroke()
    context.closePath()
  }

  isDone() {
    return !(this.#opacity > 0)
  }

  get [Symbol.toStringTag]() {
    return { start: this.#start, end: this.#end }
  }
}

const interval = 3000;
// const lightningStrikeOffset = 5;
// const lightningBoltLength = Math.random() * 10;
// const lightningThickness = 4;
let lightning = [];

class Lightning {
  #strikeOffset
  #boltLength
  #thickness

  constructor(strikeOffset = 10, boltLength = 5, thickness = 4) {
    this.#strikeOffset = strikeOffset
    this.#boltLength = boltLength
    this.#thickness = thickness
  }

  draw(utils, instance) {
    const isDone = instance[ 0 ].isDone()
    for (const line of instance) {
      line.draw(utils)
      if (!isDone) line.decay()
    }
    return isDone
  }

  instance(utils) {
    const strikeOffset = this.#strikeOffset
    const boltLength = this.#boltLength
    const thickness = this.#thickness
    const instance = []
    const height = utils.height
    //console.log('createLigtning:width', canvasWidth())
    let x1 = getRandomInteger(2, utils.width - 2)
    let y1 = 0
    //getRandomInteger(x1 - strikeOffset, x1 + strikeOffset)
    //console.log('x1, x2', { lightningX1, lightningX2 })
    //let y1 = 0, y2 = boltLength
    const points = []
    while (y1 < height) {
      const nextAngle = getRandomFloat(0, Math.PI)
      const nextLength = strikeOffset //getRandomInteger(1, strikeOffset)
      const nextX = x1 + nextLength * Math.cos(nextAngle)
      const nextY = y1 + nextLength * Math.sin(nextAngle)
      instance.push(new Line(x1, y1, nextX, nextY, thickness, 1))
      y1 = nextY
      x1 = nextX
      points.push({ x1, y1 })
      //if (instance.length > 300) break
    }
    const branchPoint = getRandomInteger(instance.length * .25, instance.length / 4 * 3)
    x1 = points[ branchPoint ].x1
    y1 = points[ branchPoint ].y1
    let branchLength = 50
    const getNextAngle = getRandomInteger(0, 1) === 0 ? [Math.PI, 0.75 * 2 * Math.PI] : [0.75 * 2 * Math.PI, 2 * Math.PI]
    while (branchLength > 0) {
      const nextAngle = getRandomFloat(...getNextAngle)
      const nextLength = strikeOffset //getRandomInteger(1, strikeOffset)
      const nextX = x1 + nextLength * Math.cos(nextAngle)
      const nextY = y1 + nextLength * Math.sin(nextAngle)
      instance.push(new Line(x1, y1, nextX, nextY, thickness, 1))
      y1 = nextY
      x1 = nextX
      points.push({ x1, y1 })
      //if (instance.length > 300) break
      branchLength--
    }

    return instance
  }

  isDone(instance) {
    return instance[ 0 ].isDone()
  }

  //console.log('0', lightning[0])
  //console.log('1', lightning[1])
}

class Animation {
  #animations = []

  constructor() {}

  add(animation) {
    this.#animations.push(animation)
  }

  draw(utils, instances = []) {
    const newInstances = []
    const now = Date.now()
    this.#animations.forEach(animation => {
      const found = instances.find(instance => instance.animation === animation)
      if (!found) newInstances.push({ animation, isDone: true, doneAt: now })
    })
    if (newInstances.length) instances = [...instances, ...newInstances]
    for (const item of instances) {
      let { animation, instance, isDone, doneAt } = item
      if (isDone && doneAt + 3000000 > now) {
        instance = item.instance = animation.instance(utils)
      }

      if (instance) {
        if (item.isDone = animation.draw(utils, instance)) {
          item.doneAt = now
        }
      }
    }
    return instances
  }
}

const utils = new CanvasUtils(document.getElementById('canvas'))
const animation = new Animation()
animation.add(new Lightning())

let instances

const animate = function() {
  utils.clearCanvas()

  instances = animation.draw(utils, instances)

  requestAnimationFrame(animate)
}

window.addEventListener('load', (event) => {
  utils.setSize(window.innerWidth, window.innerHeight)
  requestAnimationFrame(animate)
})
