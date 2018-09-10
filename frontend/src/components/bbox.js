import React, { Component } from 'react';
import PropTypes from 'prop-types';


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


function prevent (e) {
  e.preventDefault()
}

class BBox extends Component {
  static defaultProps = {
    existingBboxes: {}
  }

  static propTypes = {
    image: PropTypes.object.isRequired,
    currentClass: PropTypes.string.isRequired,
    existingBboxes: PropTypes.object,
  }

  constructor(props) {
    super(props)
    this.node_ref = React.createRef()
    this.canvas_ref = React.createRef()
    this.state = {
      scale: 1,
      msg: '',
    }
    this.currentBbox = null
    console.log('Set bboxes in bbox.js')
    console.log(props.existingBboxes)

    this.bboxes = props.existingBboxes
    this.event_listeners = {}
  }

  get currentClass() {
    return this.props.currentClass
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

  addListener = (event, listener, ...rest) => {
    const canvas = this.canvas_ref.current
    canvas.addEventListener(event, listener, ...rest)
    if (!this.event_listeners[event]) {
      this.event_listeners[event] = []
    }
    this.event_listeners[event].push(listener)
  }

  componentDidMount() {
    this.addListener('contextmenu', prevent, false)
    this.addListener('wheel', this.trackWheel, {passive: false}) // zoom
    this.addListener('keypress', this.trackKeyboard)
    const a = ['mousemove', 'mousedown', 'mouseup', 'mouseout']
    a.forEach((x) => {this.addListener(x, this.trackPointer)})
    window.addEventListener('resize', this.setSize)
    window.cvs = this.canvas_ref.current
    this.setSize()
    this.redraw()
  }

  componentWillUnmount() {
    const canvas = this.canvas_ref.current
    for (const event in this.event_listeners) {
      for (const listener of this.event_listeners[event]){
        canvas.removeEventListener(event, listener)
      }
    }
    window.removeEventListener('resize', this.setSize);
  }

  trackKeyboard = (event) => {
    if (event.key === 'Delete' || event.key === 'd' || event.key === 'm') {
      if (this.currentBbox !== null) {
        this.bboxes[this.currentBbox.bbox.class].splice(this.currentBbox.index, 1)
        this.currentBbox = null
        document.body.style.cursor = "default"
      }
      this.redraw()
      event.preventDefault()
    }
    if (event.key === 's' || event.key === 'n') {
      this.setBboxMarkedState()
      this.currentBbox = null
      this.redraw()
      event.preventDefault()
    }
  }

  trackWheel = (event) => {
    if (event.deltaY < 0) {
      this.setState({scale: Math.min(maxZoom, this.state.scale * scrollSpeed)}, this.redraw)
    } else {
      this.setState({scale: Math.max(minZoom, this.state.scale * (1 / scrollSpeed))}, this.redraw)
    }
    this.mouse_clone = {...event}
    this.canvasX = this.mouse.realX
    this.canvasY = this.mouse.realY
    this.screenX = this.mouse.x
    this.screenY = this.mouse.y

    this.realX = this.zoomXInv(this.mouse.x)
    this.realY = this.zoomYInv(this.mouse.y)
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
    this.moveBbox()
    this.resizeBbox()
    this.changeCursorByLocation()
    this.panImage(xx, yy)
    this.redraw()
  }

  moveBbox = () => {
    const {mouse, currentBbox} = this
    if (mouse.buttonL === true && currentBbox !== null) {
      const endX = currentBbox.bbox.x + currentBbox.bbox.width
      const endY = currentBbox.bbox.y + currentBbox.bbox.height

      // Only if pointer inside the bbox
      if (mouse.startRealX >= (currentBbox.bbox.x + edgeSize) && mouse.startRealX <= (endX - edgeSize)
          && mouse.startRealY >= (currentBbox.bbox.y + edgeSize) && mouse.startRealY <= (endY - edgeSize)) {

        currentBbox.moving = true
      }

      if (currentBbox.moving === true) {
        currentBbox.bbox.x = currentBbox.originalX + (mouse.realX - mouse.startRealX)
        currentBbox.bbox.y = currentBbox.originalY + (mouse.realY - mouse.startRealY)
      }
    }
  }

  resizeBbox = () => {
    const {mouse, currentBbox} = this
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

  storeNewBbox = (movedWidth, movedHeight) => {
    const bbox = {
      x: Math.min(this.mouse.startRealX, this.mouse.realX),
      y: Math.min(this.mouse.startRealY, this.mouse.realY),
      width: movedWidth,
      height: movedHeight,
      marked: true,
      class: this.currentClass
    }

    if (typeof this.bboxes[this.currentClass] === "undefined") {
      this.bboxes[this.currentClass] = []
    }

    this.bboxes[this.currentClass].push(bbox)

    this.currentBbox = {
      bbox: bbox,
      index: this.bboxes[this.currentClass].length - 1,
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
      const currentBboxes = this.bboxes

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
    const {mouse, canvas} = this
    if (mouse.buttonL === true && this.currentClass !== null && this.currentBbox === null) {
      const width = (mouse.realX - mouse.startRealX)
      const height = (mouse.realY - mouse.startRealY)

      this.setBBoxStyles(canvas, true)
      canvas.strokeRect(this.zoomX(mouse.startRealX), this.zoomY(mouse.startRealY), this.zoom(width), this.zoom(height))
      canvas.fillRect(this.zoomX(mouse.startRealX), this.zoomY(mouse.startRealY), this.zoom(width), this.zoom(height))

      this.drawX(canvas, mouse.startRealX, mouse.startRealY, width, height)
    }
  }

  drawExistingBboxes = () => {
    const {canvas} = this

    const currentBboxes = this.bboxes

    for (let className in currentBboxes) {
      currentBboxes[className].forEach(bbox => {
        // setFontStyles(canvas, bbox.marked)
        canvas.fillText(className, this.zoomX(bbox.x), this.zoomY(bbox.y - 2))

        this.setBBoxStyles(canvas, bbox.marked)
        canvas.strokeRect(this.zoomX(bbox.x), this.zoomY(bbox.y), this.zoom(bbox.width), this.zoom(bbox.height))
        canvas.fillRect(this.zoomX(bbox.x), this.zoomY(bbox.y), this.zoom(bbox.width), this.zoom(bbox.height))
        this.drawX(canvas, bbox.x, bbox.y, bbox.width, bbox.height)
      })
    }
  }

  changeCursorByLocation = () => {
    const {mouse, currentBbox} = this

    if (this.image !== null) {
      const currentBboxes = this.bboxes

      for (let className in currentBboxes) {
        for (let i = 0; i < currentBboxes[className].length; i++) {
          const bbox = currentBboxes[className][i]

          const endX = bbox.x + bbox.width
          const endY = bbox.y + bbox.height

          if (mouse.realX >= (bbox.x + edgeSize) && mouse.realX <= (endX - edgeSize)
              && mouse.realY >= (bbox.y + edgeSize) && mouse.realY <= (endY - edgeSize)) {

            document.body.style.cursor = "pointer"

            break
          } else {
            document.body.style.cursor = "default"
          }
        }
      }

      if (currentBbox !== null) {
        const topLeftX = currentBbox.bbox.x
        const topLeftY = currentBbox.bbox.y
        const bottomLeftX = currentBbox.bbox.x
        const bottomLeftY = currentBbox.bbox.y + currentBbox.bbox.height
        const topRightX = currentBbox.bbox.x + currentBbox.bbox.width
        const topRightY = currentBbox.bbox.y
        const bottomRightX = currentBbox.bbox.x + currentBbox.bbox.width
        const bottomRightY = currentBbox.bbox.y + currentBbox.bbox.height

        if (mouse.realX >= (topLeftX + edgeSize) && mouse.realX <= (bottomRightX - edgeSize)
            && mouse.realY >= (topLeftY + edgeSize) && mouse.realY <= (bottomRightY - edgeSize)) {

          document.body.style.cursor = "move"
        } else if (mouse.realX >= (topLeftX - edgeSize) && mouse.realX <= (topLeftX + edgeSize)
                   && mouse.realY >= (topLeftY - edgeSize) && mouse.realY <= (topLeftY + edgeSize)) {
          document.body.style.cursor = "nwse-resize"

        } else if (mouse.realX >= (bottomLeftX - edgeSize) && mouse.realX <= (bottomLeftX + edgeSize)
                   && mouse.realY >= (bottomLeftY - edgeSize) && mouse.realY <= (bottomLeftY + edgeSize)) {

          document.body.style.cursor = "nesw-resize"
        } else if (mouse.realX >= (topRightX - edgeSize) && mouse.realX <= (topRightX + edgeSize)
                   && mouse.realY >= (topRightY - edgeSize) && mouse.realY <= (topRightY + edgeSize)) {

          document.body.style.cursor = "nesw-resize"
        } else if (mouse.realX >= (bottomRightX - edgeSize) && mouse.realX <= (bottomRightX + edgeSize)
                   && mouse.realY >= (bottomRightY - edgeSize) && mouse.realY <= (bottomRightY + edgeSize)) {

          document.body.style.cursor = "nwse-resize"
        }
      }
    }
  }

  drawX = (canvas, x, y, width, height) => {
    if (drawCenterX === true) {
      const centerX = x + width / 2
      const centerY = y + height / 2

      canvas.beginPath()
      canvas.moveTo(this.zoomX(centerX), this.zoomY(centerY - 10))
      canvas.lineTo(this.zoomX(centerX), this.zoomY(centerY + 10))
      canvas.stroke()

      canvas.beginPath()
      canvas.moveTo(this.zoomX(centerX - 10), this.zoomY(centerY))
      canvas.lineTo(this.zoomX(centerX + 10), this.zoomY(centerY))
      canvas.stroke()
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

  setBBoxStyles = (canvas, marked) => {
    canvas.setLineDash([])

    if (marked === false) {
      canvas.strokeStyle = borderColor
      canvas.fillStyle = backgroundColor
    } else {
      canvas.strokeStyle = markedBorderColor
      canvas.fillStyle = markedBackgroundColor
    }
  }

  get image () {
    return this.props.image
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
        <h1>Current class: {this.props.currentClass} Scale: {this.state.scale}</h1>
        <canvas className='bbox-canvas' ref={this.canvas_ref} tabIndex="1"></canvas>
      </div>
    )
  }
}


export default BBox;
