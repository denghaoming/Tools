import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import Web3 from 'web3'
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import "../ImportVip/ImportVip.css"
import '../Token/Token.css'
import { CSVLink, CSVDownload } from "react-csv";
import Header from '../Header';

class CreateWallet extends Component {
    state = {
        num: "",
        wallets: [],
        address: []
    }

    constructor(props) {
        super(props);
        this.createWallet = this.createWallet.bind(this);
        this.handleNumChange = this.handleNumChange.bind(this);
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    filename() {
        var time = new Date().format("yyyy-MM-dd-HH-mm-ss", "en");
        return "wallets-" + time + ".csv";
    }

    handleNumChange(event) {
        let value = this.state.num;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ num: value });
    }

    async createWallet() {
        if (!this.state.num) {
            toast.show("请输入要创建的钱包数量");
            return;
        }
        loading.show();
        let wallets = [];
        let address = [];
        try {
            const web3 = new Web3(Web3.givenProvider);
            let num = parseInt(this.state.num);
            for (let i = 0; i < num; i++) {
                var account = web3.eth.accounts.create();
                wallets.push({ address: account.address, privateKey: account.privateKey });
                address.push({ address: account.address });
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
                <input className="ModuleBg ModuleTop Contract" type="text" value={this.state.num} onChange={this.handleNumChange} pattern="[0-9]*" placeholder='输入创建钱包数量' />

                <div className="button ModuleTop" onClick={this.createWallet}>
                    创建钱包
                </div>
                <CSVLink className="button ModuleTop" data={this.state.wallets} filename={this.filename}>
                    导出钱包
                </CSVLink>
                <CSVLink className="button ModuleTop" data={this.state.address} filename={this.filename}>
                    导出地址
                </CSVLink>
                {
                    this.state.wallets.map((item, index) => {
                        return <div key={index} className="mt10 Item flex">
                            <div className='Index'>{index + 1}.</div>
                            <div className='text flex-1'> {item.address}</div>
                        </div>
                    })
                }
            </div>
        );
    }
}

export default withNavigation(CreateWallet);