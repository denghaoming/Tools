import React, { Component } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'

import WalletState, { CHAIN_ID, CHAIN_ERROR_TIP } from './state/WalletState'
import toast from './components/toast/toast'
import "./common.css"
import './App.css'
import CreateWallet from './pages/createwallet/CreateWallet'
import MultiSend from './pages/MultiSend/MultiSend'
import Tabs from './Tabs'
import More from './pages/More/More'
import Swap from './pages/Swap/Swap'
import Swap2 from './pages/Swap2/Swap2'
import Collect from './pages/Collect/Collect'

class App extends Component {
    state = { account: null, chainId: null, shortAccount: null }

    constructor(props) {
        super(props);
        this.connetWallet = this.connetWallet.bind(this);
    }

    componentDidMount() {
        WalletState.onStateChanged(this.handleAccountsChanged);
        WalletState.connetWallet();
        this.saveRef();
    }

    //保存链接里的邀请人在浏览器的缓存中,单页面应用，应用入口组件处调用
    saveRef() {
        var url = window.location.href;
        var obj = new Object();
        var scan_url = url.split("?");
        if (2 == scan_url.length) {
            scan_url = scan_url[1];
            var strs = scan_url.split("&");
            for (var x in strs) {
                var arr = strs[x].split("=");
                obj[arr[0]] = arr[1];
                //邀请人保存在浏览器的 localStorage 里
                if ("ref" == arr[0] && arr[1]) {
                    var storage = window.localStorage;
                    if (storage) {
                        storage["ref"] = arr[1];
                    }
                }
            }
        }
        return obj;
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged)
    }

    connetWallet() {
        WalletState.connetWallet();
    }

    handleAccountsChanged = () => {
        const wallet = WalletState.wallet;
        if (wallet.chainId && wallet.chainId != CHAIN_ID) {
            toast.show(CHAIN_ERROR_TIP);
            return;
        }
        let page = this;
        page.setState({
            account: wallet.account,
            chainId: wallet.chainId
        });
    }

    render() {
        return (
            <Router>
                <div>
                    <div className="content">
                        <Routes>
                            <Route path="/" exact element={<MultiSend />}></Route>
                            <Route path="/createWallets" exact element={<CreateWallet />}></Route>
                            <Route path="/more" exact element={<More />}></Route>
                            <Route path="/multiSend" exact element={<MultiSend />}></Route>
                            <Route path="/swap" exact element={<Swap />}></Route>
                            <Route path="/swap2" exact element={<Swap2 />}></Route>
                            <Route path="/collect" exact element={<Collect />}></Route>
                        </Routes>
                    </div>
                    <Tabs></Tabs>
                </div>
            </Router>
        );
    }
}

export default App;