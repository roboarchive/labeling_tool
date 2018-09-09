import React, { Component } from 'react'
import DrawBbox from './highlevel/drawBbox'
import FileBrowser from './highlevel/fileBrowser'

import 'reset-css'
import './App.css'




class Menu extends Component {
  render() {
    return (
      <div className='menu'>
        <div className='menu-item'>Browser</div>
        <div className='menu-item'>Boxes</div>
      </div>
    )
  }
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <Menu />
        <FileBrowser />
        {/* <DrawBbox classes={['word', 'other']}/> */}
      </div>
    );
  }
}

export default App;
