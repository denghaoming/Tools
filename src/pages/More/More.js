import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "../Token/Token.css"
import WalletState, { CHAIN_ID, ZERO_ADDRESS, CHAIN_ERROR_TIP, CHAIN_SYMBOL, MAX_INT } from '../../state/WalletState';
import toast from '../../components/toast/toast'

import copy from 'copy-to-clipboard';
import IconQQ from "../../images/IconQQ.png"

import Header from '../Header';

class More extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
    }
    constructor(props) {
        super(props);
    }
    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
        if (this.refreshInfoIntervel) {
            clearInterval(this.refreshInfoIntervel);
        }
    }

    handleAccountsChanged = () => {
        console.log(WalletState.wallet.lang);
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
            lang: WalletState.wallet.lang,
            local: page.getLocal()
        });
    }

    getLocal() {
        let local = {};
        return local;
    }

    copyQQ() {
        if (copy('103682866')) {
            toast.show("QQ群号已复制");
        } else {
            toast.show("复制失败");
        }
    }

    connectWallet() {
        WalletState.connetWallet();
    }

    render() {
        return (
            <div className="Token">
                <Header></Header>
                <a className="button ModuleTop" href='https://github.com/denghaoming/Tools' target='_blank'>前端Github开源仓库</a>
                <div className='QQ'>
                    <div className='Text'>联系我们</div>
                    <img src={IconQQ}></img>
                    <div className='Text mb40' onClick={this.copyQQ.bind(this)}>Q群：103682866</div>
                </div>
            </div>
        );
    }
}

export default withNavigation(More);