import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import Web3 from 'web3'
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import "../ImportVip/ImportVip.css"
import '../Token/Token.css'
import { CSVLink, CSVDownload } from "react-csv";
import Header from '../Header';
import { ethers } from "ethers";
import BN from 'bn.js'
import WalletState from '../../state/WalletState';

class CheckCreateContract extends Component {
    state = {
        num: "",
        wallets: [],
        address: [],
        token0: WalletState.config.USDT,
    }

    constructor(props) {
        super(props);
        this.createWallet = this.createWallet.bind(this);
        this.handleToken0Change = this.handleToken0Change.bind(this);
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    filename() {
        var time = new Date().format("yyyy-MM-dd-HH-mm-ss", "en");
        return "wallets-" + time + ".csv";
    }

    handleToken0Change(event) {
        this.setState({ token0: event.target.value });
    }

    async createWallet() {
        if (!ethers.utils.isAddress(this.state.token0)) {
            toast.show("请输入正确的token0合约地址");
            return;
        }
        let token0 = new BN(this.state.token0.replace('0x', ''), 16);
        // console.log("token0",token0.toString(10));
        loading.show();
        let wallets = [];
        let address = [];
        try {
            const web3 = new Web3(Web3.givenProvider);

            for (; ;) {
                var account = web3.eth.accounts.create();
                let contractAddress = ethers.utils.getContractAddress({ from: account.address, nonce: 0 });
                // let contractAddress = ethers.utils.getContractAddress({ from: "0x6CC619cB44A2a33c863c5F9A11d99EBf09eD160A", nonce: 0 });
                let token1 = new BN(contractAddress.replace('0x', ''), 16);
                // console.log("token1",token1.toString(10));
                //撤池子的时候，池子会先转出token0，
                //如果token0是别的币，在池子转出当前合约代币的时候，那就可以判断池子token0的balance和reverse0大小，是否撤池子
                //加池子，swap合约按照用户指定顺序转入代币
                //如果先转入别的币，在池子转入当前合约代币的时候，那就可以判断池子token0的balance和reverse0大小，是否加池子
                //综上，主要想办法让当前合约代币成为token1即可判断加池子，撤池子，买入和卖出
                //加池子时，需要指引用户，让用户将token0放在上面的输入框，合约代币作为token1放在下面的输入框，这样能保证先转入token0
                if (token1.gt(token0)) {
                    console.log("contractAddress", contractAddress);
                    wallets.push({ address: account.address, privateKey: account.privateKey });
                    address.push({ address: account.address });
                    console.log('address',account.address);
                    contractAddress = ethers.utils.getContractAddress({ from: account.address, nonce: 0 });
                    console.log("contractAddress", contractAddress);
                    break;
                }
            }
            this.setState({ wallets: wallets, address: address });
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    render() {
        return (
            <div className="Token ImportVip">
                <Header></Header>
                <input className="ModuleBg ModuleTop Contract" type="text" value={this.state.token0} onChange={this.handleToken0Change} placeholder='输入token0合约地址' />
                <div className="button ModuleTop" onClick={this.createWallet}>
                    创建部署新合约的钱包
                </div>
                {
                    this.state.wallets.map((item, index) => {
                        return <div key={index} className="mt10 Item flex">
                            <div className='Index'>{index + 1}.</div>
                            <div className='text flex-1'> {item.privateKey}</div>
                        </div>
                    })
                }
            </div>
        );
    }
}

export default withNavigation(CheckCreateContract);