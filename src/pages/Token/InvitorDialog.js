import ReactDOM from 'react-dom';
import React, { Component } from 'react'
import WalletState from '../../state/WalletState';
import Web3 from 'web3'
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import './InvitorDialog.css';
import { ERC20_ABI } from '../../abi/erc20';

class InvitorDialog extends Component {
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

    async claimAirdrop() {
        let invitor = this.state.invitor;
        if (!invitor) {
            toast.show("请填写邀请地址");
            return;
        }
        try {
            loading.show();
            let account = WalletState.wallet.account;
            const web3 = new Web3(Web3.givenProvider);
            const tokenContract = new web3.eth.Contract(ERC20_ABI, WalletState.config.Token);
            var estimateGas = await tokenContract.methods.claimAirdrop(invitor).estimateGas({ from: account });
            var transaction = await tokenContract.methods.claimAirdrop(invitor).send({ from: account });
            if (transaction.status) {
                toast.show("领取成功");
                this.props.hide();
            } else {
                toast.show("领取失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    click() {

    }

    render() {
        return (
            <div className="InvitorDialog" onClick={this.click}>
                <div className="ModuleBg ContentWidth Content">
                    <div className="match flex center Title">绑定邀请地址</div>
                    <div className="PriceContainer">
                        <input className="Price" type="text" value={this.state.invitor} onChange={this.handlePriceChange} placeholder='输入邀请地址' />
                    </div>
                    <div className="Buttons">
                        <div className="Button Cancel" onClick={this.props.hide}>取消</div>
                        <div className="Button Confirm" onClick={this.claimAirdrop.bind(this)}>绑定并领取</div>
                    </div>
                </div>
            </div>
        );
    }
}

var invitorDialogNode = null;
var invitorDialog = {
    show() {
        this.hide();
        invitorDialogNode = document.createElement('div');
        document.body.appendChild(invitorDialogNode);
        ReactDOM.render(<InvitorDialog hide={this.hide}/>, invitorDialogNode);
    },
    hide() {
        if (invitorDialogNode) {
            ReactDOM.unmountComponentAtNode(invitorDialogNode);
            document.body.removeChild(invitorDialogNode);
            invitorDialogNode = null;
        }
    }
}

export default invitorDialog;