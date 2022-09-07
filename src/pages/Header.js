import React, { Component } from 'react'
import WalletState from '../state/WalletState';
import IconLink from "../images/IconLink.png"
import { withNavigation } from '../hocs'
import { showAccount } from '../utils';
import logo from "../images/logo.png"

class Header extends Component {

    state = {
        account: null,
        chainId: null,
        local: {},
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        WalletState.onStateChanged(this.handleAccountsChanged);
        this.handleAccountsChanged();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {

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
            lang: WalletState.wallet.lang,
            local: page.getLocal()
        });
    }

    getLocal() {
        let local = {}
        if ("EN" == WalletState.wallet.lang) {
            local.lang = "EN";
        } else {
            local.lang = "中文";
        }
        return local;
    }

    changeLang() {
        console.log("changeLang")
        if ("EN" == WalletState.wallet.lang) {
            WalletState.changeLang("ZH");
        } else {
            WalletState.changeLang("EN");
        }
    }

    showMenu() {

    }

    routerTo() {
        this.props.navigate("/");
    }

    render() {
        return (
            <div className="Header">
                <div className='menu' onClick={this.routerTo.bind(this)}>
                    <img src={logo}></img>
                </div>
                <div className='HTitle flex center'></div>
                <div className='account'>
                    <img className='Icon' src={IconLink}></img>
                    <div >{showAccount(this.state.account)}</div>
                </div>

            </div>
        );
    }
}

export default withNavigation(Header);