import React, { Component } from 'react';


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


class BBox extends Component {
  constructor(props) {
    super(props)
    this.canvas = React.createRef()
    this.state = {
    }
  }

  componentDidMount() {
    console.log(this.canvas)
    this.canvas.current.addEventListener('contextmenu', (e) => e.preventDefault(), false)
  }

  render() {
    return (
      <div className='bbox'>
        <h1>This is BBOX</h1>
        <canvas className='bbox-canvas' ref={this.canvas}></canvas>
      </div>
    )
  }
}


export default BBox;
