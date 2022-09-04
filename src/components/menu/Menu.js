import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "./Menu.css"
import menu from "../../images/menu.png"
import BtnClose from "../../images/BtnClose.png"
import WalletState from '../../state/WalletState'
import toast from '../toast/toast'
class Menu extends Component {
    state = {
        show: false,
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
    }

    constructor(props) {
        super(props);
        this.showMenu = this.showMenu.bind(this);
        this.hideMenu = this.hideMenu.bind(this);
    }

    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
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
        local.menuHome = "批量转账相同数量";
        local.create = "批量创建钱包地址";
        local.menuComing = "即将开放";
        return local;
    }

    showMenu() {
        if (this.state.show) {
            this.setState({ show: false });
        } else {
            this.setState({ show: true });
        }
    }

    hideMenu() {
        this.setState({ show: false })
    }

    routerTo(path, e) {
        this.setState({ show: false })
        this.props.navigate(path);
    }

    showComing(path, e) {
        toast.show(this.state.local.menuComing);
    }

    render() {
        return (
            <div className="Menu menu">
                <div className='img' onClick={this.showMenu}>
                    <img src={this.state.show ? BtnClose : menu} alt="Menu"></img>
                </div>
                {this.state.show && <div className="Menu-Bg">
                    <div className="Menu-Container">
                        <ul>
                            <li onClick={this.routerTo.bind(this, "/")}>{this.state.local.menuHome}</li>
                            <li onClick={this.routerTo.bind(this, "/createWallets")}>{this.state.local.create}</li>
                        </ul>
                    </div>
                    <div className="flex-1" onClick={this.hideMenu}></div>
                </div>}
            </div>
        );
    }
}

export default withNavigation(Menu);