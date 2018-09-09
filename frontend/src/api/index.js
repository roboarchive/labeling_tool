import axios from 'axios'
import qs from 'qs'
import _ from 'lodash'
import { observable } from 'mobx'

class Files {
  @observable list = []
  @observable page = 0
  @observable currIdx = null
  @observable processing = false

  constructor () {
    this.uri = '/api/file'
    this.denoize = '/api/denoize'
    this.loadFiles()
  }

  get curr() {
    console.log(`Curr idx: ${this.currIdx}`)
    if (this.currIdx === null){
      return null
    }
    return this.list[this.currIdx]
  }

  source = () => {
    if (this.curr === null){
      console.log('No curr')
      return null
    }
    return `/api/static/${this.curr.name}`
  }

  dest = () => {
    if (this.curr !== null && this.curr.processed) {
      return `/api/train-bbox/raw/samples/${this.curr.name}`
    }
    return null
  }

  callProcess = async () => {
    this.processing = true
    const resp = await axios.get(`${this.denoize}?${qs.stringify({name: this.curr.name})}`)
    console.log(resp.data)
    await this.loadFiles()
    this.processing = false
  }

  loadFiles = async () => {
    console.log(`request ${this.uri}`)
    const resp = await axios.get(`${this.uri}?${qs.stringify({page: this.page})}`)
    const {data: {files}} = resp
    // this.page += 1
    this.list = files
    console.log(files[0])
  }
}

const files = new Files();

export { files };
