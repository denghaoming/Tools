import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import WalletState from '../../state/WalletState';
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import Web3 from 'web3'
import { ERC20_ABI } from '../../abi/erc20';
import { MultiSend_ABI } from '../../abi/MultiSend_ABI';
import "../ImportVip/ImportVip.css"
import '../Token/Token.css'

import Header from '../Header';
import { toWei } from '../../utils';
import BN from 'bn.js'

class ImportVip extends Component {
    state = {
        chainId: '',
        account: '',
        wallets: [],
        address: [],
        amount: null,
    }

    constructor(props) {
        super(props);
        this.handleFileReader = this.handleFileReader.bind(this);
    }

    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
    }

    handleFileReader(e) {
        let page = this;
        try {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function (e) {
                var data = e.target.result;
                var allRows = data.split("\n");
                var wallets = [];
                let index = 0;
                var exits = {};
                var privateKeyTitle = "privateKey";
                var privateKeyIndex = 2;
                var addressTitle = "address";
                var addressIndex = 1;
                var addrs = [];
                for (let singleRow = 0; singleRow < allRows.length; singleRow++) {
                    let rowCells = allRows[singleRow].split(',');
                    if (singleRow === 0) {

                    } else {
                        index++;
                        // 表格内容
                        //rowCells[rowCell];
                        let address = rowCells[addressIndex].replaceAll('\"', '');
                        if (exits[address]) {
                            console.log("exits", address);
                            continue;
                        }
                        exits[address] = true;
                        let privateKey = rowCells[privateKeyIndex].replaceAll('\"', '');
                        console.log("address", address);
                        console.log("privateKey", privateKey);
                        wallets.push({ address: address, id: index, privateKey: privateKey })
                        addrs.push(address);
                    }
                };
                page.setState({ wallets: wallets });
            }
            reader.readAsText(file);
        } catch (error) {
            console.log("error", error);
            toast.show(error);
        } finally {

        }
    }

    handleAccountsChanged = () => {
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account
        });
    }

    async setVip(level, enable) {
        let account = WalletState.wallet.account;
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenContract = new web3.eth.Contract(ERC20_ABI, WalletState.config.Token);
            var num = this.state.num;
            let tos = [];
            let wallets = this.state.wallets;
            let length = wallets.length;
            for (let index = 0; index < length; index++) {
                tos.push(wallets[index].address);
            }
            console.log("tos", tos);
            console.log("num", num);

            if (1 == level) {
                let estimateGas = await tokenContract.methods.setVipA(tos, enable).estimateGas({ from: account });
            } else if (2 == level) {
                let estimateGas = await tokenContract.methods.setVipB(tos, enable).estimateGas({ from: account });
            } else if (3 == level) {
                let estimateGas = await tokenContract.methods.setVipC(tos, enable).estimateGas({ from: account });
            }

            let transaction;
            let tip;
            if (1 == level) {
                tip = 'YYDS，VIP/IDO卡';
                transaction = await tokenContract.methods.setVipA(tos, enable).send({ from: account });
            } else if (2 == level) {
                tip = 'LEO,VIP';
                transaction = await tokenContract.methods.setVipB(tos, enable).send({ from: account });
            } else if (3 == level) {
                tip = 'LEO用户';
                transaction = await tokenContract.methods.setVipC(tos, enable).send({ from: account });
            }
            if (transaction.status) {
                toast.show("已批量设置" + tip);
            } else {
                toast.show("设置失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    async sendBNB() {
        let account = WalletState.wallet.account;
        loading.show();
        let amount = toWei(this.state.amount, 18);
        try {
            const web3 = new Web3(Web3.givenProvider);
            const MultiSendContract = new web3.eth.Contract(MultiSend_ABI, WalletState.config.MultiSend);
            let tos = [];
            let wallets = this.state.wallets;
            let length = wallets.length;
            for (let index = 0; index < length; index++) {
                tos.push(wallets[index].address);
            }
            console.log("tos", tos);
            let value = amount.mul(new BN(length));
            var estimateGas = await MultiSendContract.methods.sendBNB(tos, amount).estimateGas({ from: account, value: value });
            var transaction = await MultiSendContract.methods.sendBNB(tos, amount).send({ from: account, value: value });
            if (transaction.status) {
                toast.show("已经批量转账BNB");
            } else {
                toast.show("转账失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    async batchClaimAirdrop() {
        let wallets = this.state.wallets;
        let length = wallets.length;
        for (let index = 0; index < length; index++) {
            this.claimAirdrop(wallets[index]);
        }
    }

    async claimAirdrop(wallet) {
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(WalletState.config.RPC, options));
            const tokenContract = new myWeb3.eth.Contract(ERC20_ABI, WalletState.config.Token);
            var gasPrice = await myWeb3.eth.getGasPrice();
            console.log("gasPrice", gasPrice);
            gasPrice = new BN(gasPrice, 10).mul(new BN("120", 10)).div(new BN("100", 10));
            console.log("gasPrice", gasPrice);

            //Data
            var data = tokenContract.methods.claimAirdrop(WalletState.config.Invitor).encodeABI();
            console.log("data", data);

            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            var gas = await tokenContract.methods.claimAirdrop(WalletState.config.Invitor).estimateGas({ from: wallet.address });
            gas = new BN(gas, 10).mul(new BN("120", 10)).div(new BN("100", 10));
            console.log("gas", gas);

            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: WalletState.config.CHAIN_ID,
                value: Web3.utils.toHex("0"),
                to: WalletState.config.Token,
                data: data,
                from: wallet.address,
            };

            console.log("value", Web3.utils.toHex("0"));

            var fee = new BN(gas, 10).mul(new BN(gasPrice, 10));
            console.log("fee", Web3.utils.fromWei(fee, "ether"));

            //交易签名
            let privateKey = wallet.privateKey;
            var signedTx = await myWeb3.eth.accounts.signTransaction(txParams, privateKey);
            console.log("signedTx", signedTx);
            // let transaction = await myWeb3.eth.sendSignedTransaction(signedTx.rawTransaction);
            //交易失败
            // if (!transaction.status) {
            //     toast.show("领取失败");
            //     return;
            // }
            // console.log("已领取");
            // toast.show("已领取");
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {

        }
    }

    handleAmountChange(event) {
        let value = this.state.amount;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ amount: value });
    }

    render() {
        return (
            <div className="Token ImportVip">
                <Header></Header>
                <div className="mt20">
                    导入csv文件: <input type="file" onChange={this.handleFileReader} />
                </div>
                <input className="ModuleBg ModuleTop Contract" type="text" value={this.state.amount} onChange={this.handleAmountChange.bind(this)} pattern="[0-9.]*" placeholder='输入转账数量' />
                <div className="button ModuleTop" onClick={this.sendBNB.bind(this)}>批量转账</div>
                <div className="button ModuleTop" onClick={this.batchClaimAirdrop.bind(this)}>批量领取空投</div>
                {
                    this.state.wallets.map(item => {
                        return <div key={item.id} className="mt10 Item flex">
                            <div className='Index'>{item.id}.</div>
                            <div className='text flex-1'> {item.address}</div>
                        </div>
                    })
                }
            </div>
        );
    }
}

export default withNavigation(ImportVip);