import { easeInExpo, easeInOutBounce, easeOutBounce } from './easing.js'

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
    if (width != this.#canvas.width) this.#canvas.width = width
    if (height != this.#canvas.height) this.#canvas.height = height
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

  get x() {
    return this.#start.x
  }

  get y() {
    return this.#start.y
  }

  draw(utils, eased) {
    const context = utils.context
    const opacity = this.#opacity * eased
    const thickness = this.#thickness * eased
    context.beginPath()
    context.moveTo(this.#start.x, this.#start.y)
    context.lineTo(this.#end.x, this.#end.y)
    context.lineWidth = thickness
    context.strokeStyle = `rgba(255, 255, 255, ${opacity})`
    context.shadowBlur = 30
    context.shadowColor = '#bd9df2'
    context.stroke()
    context.closePath()
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

const adjustT = (min, t, max) => {
  return (t - min) / (max - min)
}

const lightningEasing = [
  { min: 1, max: 2, easing: (t) => 0 },
  { min: 0.8, max: 1, easing: (t) => easeInExpo(1 - t) },
  { min: 0, max: 0.8, easing: easeOutBounce },
]

const easeLightning = (t) => {
  if (t < 0) return 0
  if (t > 1) return 1
  const easing = lightningEasing.find((e) => e.min <= t && t < e.max)
  return easing.easing(adjustT(easing.min, t, easing.max))
}

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
    const { t, lines } = instance
    const isDone = t <= 0
    const eased = easeLightning(t)
    for (const line of lines) {
      line.draw(utils, eased)
    }
    instance.t -= 0.01
    return isDone
  }

  instance(utils) {
    const strikeOffset = this.#strikeOffset
    const boltLength = this.#boltLength
    const thickness = this.#thickness
    const lines = []
    const height = utils.height
    //console.log('createLigtning:width', canvasWidth())
    let x1 = getRandomInteger(2, utils.width - 2)
    let y1 = 0
    //getRandomInteger(x1 - strikeOffset, x1 + strikeOffset)
    //console.log('x1, x2', { lightningX1, lightningX2 })
    //let y1 = 0, y2 = boltLength
    while (y1 < height) {
      const nextAngle = getRandomFloat(0, Math.PI)
      const nextLength = strikeOffset //getRandomInteger(1, strikeOffset)
      const nextX = x1 + nextLength * Math.cos(nextAngle)
      const nextY = y1 + nextLength * Math.sin(nextAngle)
      lines.push(new Line(x1, y1, nextX, nextY, thickness, 1))
      y1 = nextY
      x1 = nextX
      //if (lines.length > 300) break
    }
    const extraSegments = []
    extraSegments.length = getRandomInteger(2, 5)
    const primaryLength = lines.length
    let extraAngleDirection = getRandomInteger(0, 2)
    for (let i = 0; i < extraSegments.length; i++) {
      const extraSegment = extraSegments[ i ] = []
      const branchPoint = getRandomInteger(primaryLength * .25, primaryLength * .9)
      x1 = lines[ branchPoint ].x
      y1 = lines[ branchPoint ].y
      let branchLength = getRandomInteger(5, 75)
      const getNextAngle = extraAngleDirection === 0 ? [Math.PI, 0.75 * 2 * Math.PI] : [0.75 * 2 * Math.PI, 2 * Math.PI]
      extraAngleDirection = !extraAngleDirection
      while (branchLength > 0) {
        const nextAngle = getRandomFloat(...getNextAngle)
        const nextLength = strikeOffset //getRandomInteger(1, strikeOffset)
        const nextX = x1 + nextLength * Math.cos(nextAngle)
        const nextY = y1 + nextLength * Math.sin(nextAngle)
        extraSegment.push(new Line(x1, y1, nextX, nextY, thickness, 1))
        y1 = nextY
        x1 = nextX
        //if (lines.length > 300) break
        branchLength--
      }
      lines.push(...extraSegment)
    }

    return {t: 1, lines}
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
      if (!found) newInstances.push({ animation, isDone: true, doneAt: 0 })
    })
    if (newInstances.length) instances = [...instances, ...newInstances]
    for (const item of instances) {
      let { animation, instance, isDone, doneAt } = item
      if (isDone && (now - doneAt) / 1000 > 3) {
        //console.log('isDone, restart', { doneAt, now, diff: (now - doneAt) / 1000 })
        instance = item.instance = animation.instance(utils)
        item.isDone = false
      }

      if (instance) {
        if (!item.isDone && (item.isDone = animation.draw(utils, instance))) {
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
  utils.setSize(window.innerWidth, window.innerHeight)
  utils.clearCanvas()

  instances = animation.draw(utils, instances)

  requestAnimationFrame(animate)
}

window.addEventListener('load', (event) => {
  requestAnimationFrame(animate)
})
