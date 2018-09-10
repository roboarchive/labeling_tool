import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import BBox from '../components/bbox'
import LabelSelector from '../components/selector'
import { files } from '../api'


class SaveButton extends Component {
  render() {
    return (<div className="saveButton"><button onClick={this.props.onSave}>Save</button></div>)
  }
}

@observer
class DrawBbox extends Component {
  static propTypes = {
    classes: PropTypes.array.isRequired,
    files: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {currentClass: props.classes[0]}
    this.bbox_ref = React.createRef()
  }

  onLoadImage = () => {
    this.setState({image: this.image})
  }

  loadImage = (name) => {
    this.image = new Image()
    this.image.onload = this.onLoadImage
    this.image.src = `/api/train-bbox/${name}`
  }

  componentDidMount() {
    const {match: {params: {imageName}}} = this.props
    this.loadImage(imageName)
  }

  selectClass = (e) => {
    console.log(e)
    this.setState({currentClass: e.target.value})
  }

  get bbox() {
    return this.bbox_ref.current;
  }

  onSave = async () => {
    console.log(this.bbox.bboxes)
    await this.props.files.saveBboxes(this.bbox.bboxes)
  }

  setIndex = async () => {
    const {match: {params: {imageName}}} = this.props
    this.props.files.setIdxByName(imageName)
  }

  render(props) {
    let {state: {image}} = this

    if (!image || this.props.files.currentBboxes === null) {
      setTimeout(this.setIndex, 0)
      return <h2>Loading...</h2>
    }

    return (
      <div className="ltool">
        <LabelSelector classes={this.props.classes} value={this.state.currentClass} onChange={this.selectClass}/>
        <SaveButton onSave={this.onSave} />
        <BBox ref={this.bbox_ref} image={this.state.image} currentClass={this.state.currentClass} existingBboxes={this.props.files.currentBboxes}/>
      </div>
    )
  }
}

class DrawBboxWrapper extends Component {
  render() {
    return <DrawBbox files={files} {...this.props} />
  }
}

export default DrawBboxWrapper
