import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { observer } from 'mobx-react'

import { files } from '../api'


@observer
class FileList extends Component {
  static propTypes = {
    files: PropTypes.object.isRequired,
  }

  fileClick(idx) {
    return () => {
      console.log(`On click idx: ${idx} => ${this.props.files.list[idx].name}`)
      this.props.files.setIdx(idx)
    }
  }

  files() {
    console.log(`We have: ${this.props.files.list.length} files`)
    return this.props.files.list.map((f, idx) => {
      const cls = f.processed ? 'processed' : 'not-processed'
      return <div className={cls} onClick={this.fileClick(idx)} key={idx}>{f.name}</div>
    })
  }

  render() {
    return (
      <div className="file-select">
        {this.files()}
      </div>
    )
  }
}

@observer
class FileSource extends Component {
  static propTypes = {
    files: PropTypes.object.isRequired,
  }

  showImage () {
    return <img className='browser-image' src={this.fileName} alt='src'/>
  }

  get fileName () {
    return this.props.files.source()
  }

  render() {
    console.log(this.props)

    return (
      <div className='file-source'>
        FileSource
        <h1>Curr idx: {this.props.files.currIdx}</h1>
        {this.fileName ? this.showImage() : <div>No File</div>}
      </div>
    )
  }
}


@observer
class FileDest extends Component {
  static propTypes = {
    files: PropTypes.object.isRequired,
  }

  showImage () {
    return (
      <Link to={`/boxes/${this.props.files.curr.name}`}>
        <img className='browser-image' src={this.fileName} alt='dest'/>
      </Link>
    )
  }

  get fileName () {
    return this.props.files.dest()
  }

  processClick = async () => {
    console.log(`Process image: ${this.props.files.curr.name}`)
    await this.props.files.callProcess()
  }

  processButton () {
    if (this.props.files.currIdx === null) {
      return <noscript/>
    }
    if (this.props.files.processing) {
      return <div>Processing...</div>
    }

    return <button onClick={this.processClick}>Process file</button>
  }

  render() {
    console.log(this.props)
    return (
      <div className='file-dest'>
        FileDest
        <h1>Curr idx: {this.props.files.currIdx}</h1>
        {this.fileName ? this.showImage() : this.processButton()}
      </div>
    )
  }
}



class FileBrowser extends Component {
  render() {
    return (
      <div className="file-browser-top">
        <FileList files={files} />
        <FileSource files={files} />
        <FileDest files={files} />
      </div>
    )
  }
}

export default FileBrowser;
