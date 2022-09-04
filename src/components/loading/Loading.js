import ReactDOM from 'react-dom';
import React, { Component } from 'react'
import './Loading.css';
import ic_loading from './ic_loading.png';

class Loading extends Component {
    render() {
        return (
            <div className="Loading" onClick={this.loadingClick}>
                <img src={ic_loading} className="Loading-logo" alt="loading"></img>
                Loading
            </div>
        );
    }
    loadingClick(){

    }
}

var loadingNode = null;
var loading = {
    show(){
        this.hide();
        loadingNode = document.createElement('div');
        document.body.appendChild(loadingNode);
        ReactDOM.render(<Loading/>, loadingNode);
    },
    hide(){
        if(loadingNode){
            ReactDOM.unmountComponentAtNode(loadingNode);
            document.body.removeChild(loadingNode);
            loadingNode = null;
        }
    }
}

export default loading;