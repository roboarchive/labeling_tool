import React, { Component } from 'react';


const minZoom = 0.1 // Smallest zoom allowed
const maxZoom = 15 // Largest zoom allowed
const scrollSpeed = 1.1 // Multiplying factor of wheel speed
const minBBoxWidth = 5 // Minimal width of bbox
const minBBoxHeight = 5 // Minimal height of bbox
const edgeSize = 5 // Resize activation area in pixels
const drawCenterX = true // Whether to draw a cross in the middle of bbox
const borderColor = "#001f3f" // Base bbox border color
const backgroundColor = "rgba(0, 116, 217, 0.2)" // Base bbox fill color

const markedBorderColor = "#FF4136" // Marked bbox border color
const markedBackgroundColor = "rgba(255, 133, 27, 0.2)" // Marked bbox fill color

/*
const markedFontColor = "#FF4136" // Marked bbox font color
const saveInterval = 60 // Bbox recovery save in seconds
const fontBaseSize = 30 // Text size in pixels
const fontColor = "#001f3f" // Base font color
const scrollSpeed = 1.1 // Multiplying factor of wheel speed
const minZoom = 0.1 // Smallest zoom allowed
const maxZoom = 5 // Largest zoom allowed

const resetCanvasOnChange = true // Whether to return to default position and zoom on image change
const defaultScale = 0.5 // Default zoom level for images. Can be overridden with fittedZoom

const drawGuidelines = true // Whether to draw guidelines for cursor
const fittedZoom = true // Whether to fit image in the screen by it's largest dimension. Overrides defaultScale
*/
/*
const zoom = (number) => {
  return Math.floor(number * scale)
}

const zoomX = (number) => {
  return Math.floor((number - canvasX) * scale + screenX)
}

const zoomY = (number) => {
  return Math.floor((number - canvasY) * scale + screenY)
}

const zoomXInv = (number) => {
  return Math.floor((number - screenX) * (1 / scale) + canvasX)
}

const zoomYInv = (number) => {
  return Math.floor((number - screenY) * (1 / scale) + canvasY)
}*/


function prevent (e) {
  e.preventDefault()
}

class BBox extends Component {
  constructor(props) {
    super(props)
    this.node_ref = React.createRef()
    this.canvas_ref = React.createRef()
    this.state = {
      scale: 1,
      msg: '',
    }
    this.currentBbox = null
    this.currentClass = 'word'
    this.bboxes = {}
  }

  setSize = () => {
    const node_rect = this.node_rect
    this.canvas_ref.current.width = node_rect.width
    this.canvas_ref.current.height = node_rect.height
    const rect = this.rect

    this.width = rect.width
    this.height = rect.height
    this.canvasX = 0
    this.canvasY = 0
    this.screenX = 0
    this.screenY = 0
    this.setState({height: this.height, width: this.width})
    console.log(`${this.width} / ${this.height}`)

    this.realX = 0
    this.realY = 0
    this.mouse = {
        x: 0,
        y: 0,
        realX: 0,
        realY: 0,
        buttonL: false,
        buttonR: false,
        startRealX: 0,
        startRealY: 0
    }
  }

  componentDidMount() {
    console.log(this.canvas_ref)
    const canvas = this.canvas_ref.current
    canvas.addEventListener('contextmenu', prevent, false)
    canvas.addEventListener('wheel', this.trackWheel, {passive: false})
    canvas.addEventListener('mousemove', this.trackPointer)
    canvas.addEventListener('mousedown', this.trackPointer)
    canvas.addEventListener('mouseup', this.trackPointer)
    canvas.addEventListener('mouseout', this.trackPointer)
    window.addEventListener("resize", this.setSize)
    window.cvs = this.canvas_ref.current
    this.setSize()
    this.loadDefaultImage()
  }

  componentWillUnmount() {
    const canvas = this.canvas_ref.current
    canvas.removeEventListener('contextmenu', prevent)
    canvas.removeEventListener('wheel', this.trackWheel)
    canvas.removeEventListener('mousemove', this.trackPointer)
    canvas.removeEventListener('mousedown', this.trackPointer)
    canvas.removeEventListener('mouseup', this.trackPointer)
    canvas.removeEventListener('mouseout', this.trackPointer)
    window.removeEventListener("resize", this.setSize);
  }

  trackWheel = (event) => {
    if (event.deltaY < 0) {
      this.setState({scale: Math.min(maxZoom, this.state.scale * scrollSpeed)}, this.redraw)
    } else {
      this.setState({scale: Math.max(minZoom, this.state.scale * (1 / scrollSpeed))}, this.redraw)
    }
    this.mouse_clone = {...event}
    console.log(event)
    this.canvasX = this.mouse.realX
    this.canvasY = this.mouse.realY
    this.screenX = this.mouse.x
    this.screenY = this.mouse.y

    this.realX = this.zoomXInv(this.mouse.x)
    this.realY = this.zoomYInv(this.mouse.y)

    console.log(`CX: ${this.canvasX} CY: ${this.canvasY} SX: ${this.screenX} SY: ${this.screenY}`)

    event.preventDefault()
  }

  trackPointer = (event) => {
    this.mouse.bounds = this.rect

    this.mouse.x = event.offsetX
    this.mouse.y = event.offsetY

    const xx = this.mouse.realX
    const yy = this.mouse.realY

    this.mouse.realX = this.zoomXInv(this.mouse.x)
    this.mouse.realY = this.zoomYInv(this.mouse.y)
    if (event.type === "mousedown") {
      this.mouse.startRealX = this.mouse.realX
      this.mouse.startRealY = this.mouse.realY

      if (event.which === 3) {
        this.mouse.buttonR = true
      } else if (event.which === 1) {
        this.mouse.buttonL = true
      }
    } else if (event.type === "mouseup" || event.type === "mouseout") {
      if (this.mouse.buttonL === true && this.image !== null) {
        const movedWidth = Math.max((this.mouse.startRealX - this.mouse.realX), (this.mouse.realX - this.mouse.startRealX))
        const movedHeight = Math.max((this.mouse.startRealY - this.mouse.realY), (this.mouse.realY - this.mouse.startRealY))

        if (movedWidth > minBBoxWidth && movedHeight > minBBoxHeight) { // Only add if bbox is big enough
          if (this.currentBbox === null) { // And only when no other bbox is selected
            this.storeNewBbox(movedWidth, movedHeight)
          } else { // Bbox was moved or resized - update original data
            this.updateBboxAfterTransform()
          }
        } else { // (un)Mark a bbox
          this.setBboxMarkedState()

          if (this.currentBbox !== null) { // Bbox was moved or resized - update original data
            this.updateBboxAfterTransform()
          }
        }
      }

      this.mouse.buttonR = false
      this.mouse.buttonL = false
    }
    this.panImage(xx, yy)
    this.redraw()
  }

  storeNewBbox = (movedWidth, movedHeight) => {
    const bbox = {
      x: Math.min(this.mouse.startRealX, this.mouse.realX),
      y: Math.min(this.mouse.startRealY, this.mouse.realY),
      width: movedWidth,
      height: movedHeight,
      marked: true
    }

    if (typeof this.bboxes[this.image.name] === "undefined") {
      this.bboxes[this.image.name] = {}
    }

    if (typeof this.bboxes[this.image.name][this.currentClass] === "undefined") {
      this.bboxes[this.image.name][this.currentClass] = []
    }

    this.bboxes[this.image.name][this.currentClass].push(bbox)

    this.currentBbox = {
      bbox: bbox,
      index: this.bboxes[this.image.name][this.currentClass].length - 1,
      originalX: bbox.x,
      originalY: bbox.y,
      originalWidth: bbox.width,
      originalHeight: bbox.height,
      moving: false,
      resizing: null
    }
  }

  updateBboxAfterTransform = () => {
    const currentBbox = this.currentBbox

    if (currentBbox.resizing !== null) {
      if (currentBbox.bbox.width < 0) {
        currentBbox.bbox.width = Math.abs(currentBbox.bbox.width)
        currentBbox.bbox.x -= currentBbox.bbox.width
      }

      if (currentBbox.bbox.height < 0) {
        currentBbox.bbox.height = Math.abs(currentBbox.bbox.height)
        currentBbox.bbox.y -= currentBbox.bbox.height
      }

      currentBbox.resizing = null
    }

    currentBbox.bbox.marked = true
    currentBbox.originalX = currentBbox.bbox.x
    currentBbox.originalY = currentBbox.bbox.y
    currentBbox.originalWidth = currentBbox.bbox.width
    currentBbox.originalHeight = currentBbox.bbox.height
    currentBbox.moving = false
  }

  resizeBbox = () => {
    const currentBbox = this.currentBbox
    const mouse = this.mouse

    if (mouse.buttonL === true && currentBbox !== null) {
      const topLeftX = currentBbox.bbox.x
      const topLeftY = currentBbox.bbox.y
      const bottomLeftX = currentBbox.bbox.x
      const bottomLeftY = currentBbox.bbox.y + currentBbox.bbox.height
      const topRightX = currentBbox.bbox.x + currentBbox.bbox.width
      const topRightY = currentBbox.bbox.y
      const bottomRightX = currentBbox.bbox.x + currentBbox.bbox.width
      const bottomRightY = currentBbox.bbox.y + currentBbox.bbox.height

      // Get correct corner
      if (mouse.startRealX >= (topLeftX - edgeSize) && mouse.startRealX <= (topLeftX + edgeSize)
          && mouse.startRealY >= (topLeftY - edgeSize) && mouse.startRealY <= (topLeftY + edgeSize)) {

        currentBbox.resizing = "topLeft"
      } else if (mouse.startRealX >= (bottomLeftX - edgeSize) && mouse.startRealX <= (bottomLeftX + edgeSize)
                 && mouse.startRealY >= (bottomLeftY - edgeSize) && mouse.startRealY <= (bottomLeftY + edgeSize)) {

        currentBbox.resizing = "bottomLeft"
      } else if (mouse.startRealX >= (topRightX - edgeSize) && mouse.startRealX <= (topRightX + edgeSize)
                 && mouse.startRealY >= (topRightY - edgeSize) && mouse.startRealY <= (topRightY + edgeSize)) {

        currentBbox.resizing = "topRight"
      } else if (mouse.startRealX >= (bottomRightX - edgeSize) && mouse.startRealX <= (bottomRightX + edgeSize)
                 && mouse.startRealY >= (bottomRightY - edgeSize) && mouse.startRealY <= (bottomRightY + edgeSize)) {

        currentBbox.resizing = "bottomRight"
      }

      if (currentBbox.resizing === "topLeft") {
        currentBbox.bbox.x = mouse.realX
        currentBbox.bbox.y = mouse.realY
        currentBbox.bbox.width = currentBbox.originalX + currentBbox.originalWidth - mouse.realX
        currentBbox.bbox.height = currentBbox.originalY + currentBbox.originalHeight - mouse.realY
      } else if (currentBbox.resizing === "bottomLeft") {
        currentBbox.bbox.x = mouse.realX
        currentBbox.bbox.y = mouse.realY - (mouse.realY - currentBbox.originalY)
        currentBbox.bbox.width = currentBbox.originalX + currentBbox.originalWidth - mouse.realX
        currentBbox.bbox.height = mouse.realY - currentBbox.originalY
      } else if (currentBbox.resizing === "topRight") {
        currentBbox.bbox.x = mouse.realX - (mouse.realX - currentBbox.originalX)
        currentBbox.bbox.y = mouse.realY
        currentBbox.bbox.width = mouse.realX - currentBbox.originalX
        currentBbox.bbox.height = currentBbox.originalY + currentBbox.originalHeight - mouse.realY
      } else if (currentBbox.resizing === "bottomRight") {
        currentBbox.bbox.x = mouse.realX - (mouse.realX - currentBbox.originalX)
        currentBbox.bbox.y = mouse.realY - (mouse.realY - currentBbox.originalY)
        currentBbox.bbox.width = mouse.realX - currentBbox.originalX
        currentBbox.bbox.height = mouse.realY - currentBbox.originalY
      }
    }
  }

  setBboxMarkedState = () => {
    const currentBbox = this.currentBbox
    const mouse = this.mouse

    if (currentBbox === null || (currentBbox.moving === false && currentBbox.resizing === null)) {
      const currentBboxes = this.bboxes[this.image.name]

      let wasInside = false
      let smallestBbox = Number.MAX_SAFE_INTEGER

      for (let className in currentBboxes) {
        for (let i = 0; i < currentBboxes[className].length; i++) {
          const bbox = currentBboxes[className][i]

          bbox.marked = false

          const endX = bbox.x + bbox.width
          const endY = bbox.y + bbox.height
          const size = bbox.width * bbox.height

          if (mouse.startRealX >= bbox.x && mouse.startRealX <= endX
              && mouse.startRealY >= bbox.y && mouse.startRealY <= endY) {

            wasInside = true

            if (size < smallestBbox) { // Make sure select the inner if it's inside a bigger one
              smallestBbox = size
              this.currentBbox = {
                bbox: bbox,
                index: i,
                originalX: bbox.x,
                originalY: bbox.y,
                originalWidth: bbox.width,
                originalHeight: bbox.height,
                moving: false,
                resizing: null
              }
            }
          }
        }
      }

      if (wasInside === false) { // No more selected bbox
        this.currentBbox = null
      }
    }
  }

  drawNewBbox = () => {
    const mouse = this.mouse
    const context = this.canvas

    if (mouse.buttonL === true && this.currentClass !== null && this.currentBbox === null) {
      const width = (mouse.realX - mouse.startRealX)
      const height = (mouse.realY - mouse.startRealY)

      this.setBBoxStyles(context, true)
      context.strokeRect(this.zoomX(mouse.startRealX), this.zoomY(mouse.startRealY), this.zoom(width), this.zoom(height))
      context.fillRect(this.zoomX(mouse.startRealX), this.zoomY(mouse.startRealY), this.zoom(width), this.zoom(height))

      this.drawX(context, mouse.startRealX, mouse.startRealY, width, height)

      this.setBboxCoordinates(mouse.startRealX, mouse.startRealY, width, height)
    }
  }

  drawExistingBboxes = () => {
    const context = this.canvas

    const currentBboxes = this.bboxes[this.image.name]

    for (let className in currentBboxes) {
      currentBboxes[className].forEach(bbox => {
        // setFontStyles(context, bbox.marked)
        context.fillText(className, this.zoomX(bbox.x), this.zoomY(bbox.y - 2))

        this.setBBoxStyles(context, bbox.marked)
        context.strokeRect(this.zoomX(bbox.x), this.zoomY(bbox.y), this.zoom(bbox.width), this.zoom(bbox.height))
        context.fillRect(this.zoomX(bbox.x), this.zoomY(bbox.y), this.zoom(bbox.width), this.zoom(bbox.height))

        this.drawX(context, bbox.x, bbox.y, bbox.width, bbox.height)

        if (bbox.marked === true) {
          this.setBboxCoordinates(bbox.x, bbox.y, bbox.width, bbox.height)
        }
      })
    }
  }

  drawX = (context, x, y, width, height) => {
    if (drawCenterX === true) {
      const centerX = x + width / 2
      const centerY = y + height / 2

      context.beginPath()
      context.moveTo(this.zoomX(centerX), this.zoomY(centerY - 10))
      context.lineTo(this.zoomX(centerX), this.zoomY(centerY + 10))
      context.stroke()

      context.beginPath()
      context.moveTo(this.zoomX(centerX - 10), this.zoomY(centerY))
      context.lineTo(this.zoomX(centerX + 10), this.zoomY(centerY))
      context.stroke()
    }
  }

  panImage = (xx, yy) => {
    if (this.mouse.buttonR === true) {
      this.canvasX -= this.mouse.realX - xx
      this.canvasY -= this.mouse.realY - yy

      this.mouse.realX = this.zoomXInv(this.mouse.x)
      this.mouse.realY = this.zoomYInv(this.mouse.y)
    }
  }

  get node_rect () {
    return this.node_ref.current.getBoundingClientRect();
  }

  get rect () {
    return this.canvas_ref.current.getBoundingClientRect();
  }
  get canvas () {
    return this.canvas_ref.current.getContext('2d')
  }

  zoom = (number) => {
    return Math.floor(number * this.state.scale)
  }

  zoomX = (number) => {
    return Math.floor((number - this.canvasX) * this.state.scale + this.screenX)
  }

  zoomY = (number) => {
    return Math.floor((number - this.canvasY) * this.state.scale + this.screenY)
  }

  zoomXInv = (number) => {
    return Math.floor((number - this.screenX) * (1 / this.state.scale) + this.canvasX)
  }

  zoomYInv = (number) => {
    return Math.floor((number - this.screenY) * (1 / this.state.scale) + this.canvasY)
  }

  onLoadImage = (e) => {
    const img = this.image
    console.log(img)
    this.fitZoom(img)
  }

  redraw = () => {
    const img = this.image
    this.canvas.clearRect(0, 0, this.width, this.height)
    const [x, y, dx, dy] = [this.zoomX(0), this.zoomY(0), this.zoom(img.width), this.zoom(img.height)]
    this.setState({msg: `X: ${x} Y: ${y}  dX: ${dx} dY: ${dy}`})
    this.canvas.drawImage(img, x, y, dx, dy)
    this.drawCross()
    this.drawNewBbox()
    this.drawExistingBboxes()
  }

  setBBoxStyles = (context, marked) => {
    context.setLineDash([])

    if (marked === false) {
      context.strokeStyle = borderColor
      context.fillStyle = backgroundColor
    } else {
      context.strokeStyle = markedBorderColor
      context.fillStyle = markedBackgroundColor
    }
  }

  setBboxCoordinates = (x, y, width, height) => {
    const x2 = x + width
    const y2 = y + height

    // document.getElementById("bboxInformation").innerHTML = `${width}x${height} (${x}, ${y}) (${x2}, ${y2})`
  }

  loadDefaultImage() {
    this.image = new Image()
    this.image.onload = this.onLoadImage
    this.image.src = '/w.png'
    console.log(this.image)
  }

  fitZoom = (image) => {
    if (image.width > image.height) {
      this.setState({scale: this.width / image.width}, this.redraw)
    } else {
      this.setState({scale: this.height / image.height}, this.redraw)
    }
  }

  drawCross = () => {
    this.canvas.setLineDash([5])

    this.canvas.beginPath()
    this.canvas.moveTo(this.zoomX(this.mouse.realX), this.zoomY(0))
    this.canvas.lineTo(this.zoomX(this.mouse.realX), this.zoomY(this.image.height))
    this.canvas.stroke()

    this.canvas.beginPath()
    this.canvas.moveTo(this.zoomX(0), this.zoomY(this.mouse.realY))
    this.canvas.lineTo(this.zoomX(this.image.width), this.zoomY(this.mouse.realY))
    this.canvas.stroke()
  }

  render() {
    return (
      <div className='bbox' ref={this.node_ref}>
        <h1>This is BBOX {this.height} {this.width} Scale: {this.state.scale}</h1>
        {this.image && (<div>{this.image.height} / {this.image.width}</div>)}
        <div>{this.state.msg}</div>
        <canvas className='bbox-canvas' ref={this.canvas_ref}></canvas>
      </div>
    )
  }
}


export default BBox;
