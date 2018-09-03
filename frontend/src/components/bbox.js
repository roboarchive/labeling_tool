import React, { Component } from 'react';


const minZoom = 0.1 // Smallest zoom allowed
const maxZoom = 15 // Largest zoom allowed
const scrollSpeed = 1.1 // Multiplying factor of wheel speed

/*
const saveInterval = 60 // Bbox recovery save in seconds
const fontBaseSize = 30 // Text size in pixels
const fontColor = "#001f3f" // Base font color
const borderColor = "#001f3f" // Base bbox border color
const backgroundColor = "rgba(0, 116, 217, 0.2)" // Base bbox fill color
const markedFontColor = "#FF4136" // Marked bbox font color
const markedBorderColor = "#FF4136" // Marked bbox border color
const markedBackgroundColor = "rgba(255, 133, 27, 0.2)" // Marked bbox fill color
const minBBoxWidth = 5 // Minimal width of bbox
const minBBoxHeight = 5 // Minimal height of bbox
const scrollSpeed = 1.1 // Multiplying factor of wheel speed
const minZoom = 0.1 // Smallest zoom allowed
const maxZoom = 5 // Largest zoom allowed
const edgeSize = 5 // Resize activation area in pixels
const resetCanvasOnChange = true // Whether to return to default position and zoom on image change
const defaultScale = 0.5 // Default zoom level for images. Can be overridden with fittedZoom
const drawCenterX = true // Whether to draw a cross in the middle of bbox
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
      this.mouse.buttonR = false
      this.mouse.buttonL = false
    }
    this.panImage(xx, yy)
    this.redraw()
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
