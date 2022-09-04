import React, { Component } from 'react'
import twitter from "../images/twitter.png"
import telegram from "../images/telegram.png"
import { withNavigation } from '../hocs'
import WalletState from '../state/WalletState';

class Footer extends Component {

    state = {
        account: null,
        chainId: null,
        local: {},
    }

    componentDidMount() {
        WalletState.onStateChanged(this.handleAccountsChanged);
        this.handleAccountsChanged();
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged)
    }

    handleAccountsChanged = () => {
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
            local: page.getLocal()
        });
    }

    getLocal() {
        let local = {}
        if ("EN" == WalletState.wallet.lang) {
            local.telegram = "https://t.me/";
        } else {
            local.telegram = "https://t.me/";
        }
        return local;
    }

    render() {
        return (
            <div className="Footer">
                <div className='Line'></div>
                <div className='CopyRight'>Copyright@ 2022 SRSC All Rights Reserved </div>
                <div className='Contact'>
                    <a className='Item' href="https://t.me/chaosmetaverse_cn" target="_blank"><img className='Telegram' src={telegram}></img></a>
                    <a className='Item' href='https://twitter.com/chaos_meta' target="_blank"><img className='Twitter' src={twitter}></img></a>
                </div>
            </div>
        );
    }
}

export default withNavigation(Footer);