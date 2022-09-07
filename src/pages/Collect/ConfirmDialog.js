import ReactDOM from 'react-dom';
import React, { Component } from 'react'
import WalletState from '../../state/WalletState';
import Web3 from 'web3'
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import './ConfirmDialog.css';
import { ERC20_ABI } from '../../abi/erc20';

class ConfirmDialog extends Component {
    state = {
        price: null,
        invitor: null,
    }

    constructor(props) {
        super(props);
        this.handlePriceChange = this.handlePriceChange.bind(this);
    }

    handlePriceChange(event) {
        let value = event.target.value;
        this.setState({ invitor: value });
    }

    async confirm() {
        this.props.hide();
        if (this.props.onConfirm) {
            this.props.onConfirm();
        }
    }

    click() {

    }

    render() {
        return (
            <div className="ConfirmDialog" onClick={this.click}>
                <div className="ModuleBg ContentWidth Content">
                    <div className="match flex center Title">确认接收地址</div>
                    <div className="PriceContainer">
                        <div className="Price" >
                            {this.props.data.address}
                        </div>
                    </div>
                    <div className="Buttons">
                        <div className="Button Cancel" onClick={this.props.hide}>取消</div>
                        <div className="Button Confirm" onClick={this.confirm.bind(this)}>确认</div>
                    </div>
                </div>
            </div>
        );
    }
}

var confirmDialogNode = null;
var confirmDialog = {
    show(data, onConfirm) {
        this.hide();
        confirmDialogNode = document.createElement('div');
        document.body.appendChild(confirmDialogNode);
        ReactDOM.render(<ConfirmDialog hide={this.hide} data={data} onConfirm={onConfirm} />, confirmDialogNode);
    },
    hide() {
        if (confirmDialogNode) {
            ReactDOM.unmountComponentAtNode(confirmDialogNode);
            document.body.removeChild(confirmDialogNode);
            confirmDialogNode = null;
        }
    }
}

export default confirmDialog;