import React, { Component } from 'react';
import PropTypes from 'prop-types';


class LabelSelector extends Component {
  static propTypes = {
    classes: PropTypes.array.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
  }

  render() {
    const items = this.props.classes.map(name => <option key={name} value={name}>{name}</option>)
    return (
      <div className="lselect">
        <div>Select class: {this.props.value}</div>
        <select size={items.length} multiple onChange={this.props.onChange} value={[this.props.value]}>
          {items}
        </select>
      </div>
    )
  }
}

export default LabelSelector
