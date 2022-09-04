import ReactDOM from 'react-dom';
import React, { Component } from 'react'
import './Toast.css';

class Toast extends Component {
    render() {
        return (
            <div className="Toast">
                {this.props.msg}
            </div>
        );
    }
}

var toastNode = null;
var toast = {
    show(msg){
        this.hide();
        toastNode = document.createElement('div');
        document.body.appendChild(toastNode);
        ReactDOM.render(<Toast msg={msg}></Toast>, toastNode);
        setTimeout(this.hide,5000);
    },
    hide(){
        if(toastNode){
            ReactDOM.unmountComponentAtNode(toastNode);
            document.body.removeChild(toastNode);
            toastNode = null;
        }
    }
}

export default toast;