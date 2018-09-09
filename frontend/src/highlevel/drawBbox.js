import React, { Component } from 'react'
import PropTypes from 'prop-types'

import BBox from '../components/bbox'
import LabelSelector from '../components/selector'

class DrawBbox extends Component {
  static propTypes = {
    classes: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {currentClass: props.classes[0]}
  }

  onLoadImage = () => {
    this.setState({image: this.image})
  }

  loadDefaultImage = () => {
    this.image = new Image()
    this.image.onload = this.onLoadImage
    this.image.src = '/w.png'
  }

  componentDidMount() {
    this.loadDefaultImage()
  }

  selectClass = (e) => {
    console.log(e)
    this.setState({currentClass: e.target.value})
  }

  render(props) {
    let {state: {image}} = this

    if (!image) {
      return <h2>Loading</h2>
    }
    return (
      <div className="ltool">
        <LabelSelector classes={this.props.classes} value={this.state.currentClass} onChange={this.selectClass}/>
        <BBox image={this.state.image} currentClass={this.state.currentClass}/>
      </div>
    )
  }
}

export default DrawBbox
