import React, { Component } from 'react'
import DrawBbox from './highlevel/drawBbox'
import FileBrowser from './highlevel/fileBrowser'
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

import 'reset-css'
import './App.css'




class Menu extends Component {
  render() {
    return (
      <div className='menu'>
        <div className='menu-item'><Link to='/'>Browser</Link></div>
      </div>
    )
  }
}

class App extends Component {
  render() {
    return (
      <Router>
        <div className="App">
          <Menu />
          <Route path='/boxes/:imageName' render={(props) => <DrawBbox classes={['word', 'other']} {...props} />}/>
          <Route exact path='/' component={FileBrowser} />
        </div>
      </Router>
    );
  }
}

export default App;
