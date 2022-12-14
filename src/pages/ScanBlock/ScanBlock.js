import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import WalletState, { MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import Web3 from 'web3'
import { ERC20_ABI } from '../../abi/erc20';
import { SwapCheck_ABI } from '../../abi/SwapCheck_ABI';
import { SwapRouter_ABI } from '../../abi/SwapRouter_ABI';
import "../ImportVip/ImportVip.css"
import '../Token/Token.css'

import Header from '../Header';
import { showFromWei, toWei } from '../../utils';
import BN from 'bn.js'

class ScanBlock extends Component {
    state = {
        chainId: '',
        account: '',
        wallets: [],
        address: [],
        amountIn: null,
        amountOut: null,
        tokenIn: WalletState.config.USDT,
        tokenOut: WalletState.config.Token,
        swapRouter: WalletState.config.SwapRouter,
        approveAccount: 0,
        auto: false
    }

    constructor(props) {
        super(props);
        this.handleFileReader = this.handleFileReader.bind(this);
        this._autoBuy = this._autoBuy.bind(this);
        this.confirmTokenIn();
        this.confirmTokenOut();
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
                var exits = {};
                var privateKeyTitle = "privateKey";
                var privateKeyIndex = 1;
                var addressTitle = "address";
                var addressIndex = 0;
                var addrs = [];
                for (let singleRow = 0; singleRow < allRows.length; singleRow++) {
                    let rowCells = allRows[singleRow].split(',');
                    if (singleRow === 0) {

                    } else {
                        // ????????????
                        //rowCells[rowCell];
                        let address = rowCells[addressIndex].replaceAll('\"', '');
                        if (exits[address]) {
                            console.log("exits", address);
                            continue;
                        }
                        exits[address] = true;
                        let privateKey = rowCells[privateKeyIndex];
                        if (privateKey) {
                            privateKey = privateKey.replaceAll('\"', '').trim();
                        }
                        if (address && privateKey) {
                            wallets.push({ address: address, privateKey: privateKey })
                            addrs.push(address);
                        }
                    }
                };
                page.setState({ wallets: wallets, approveAccount: 0 });
                page.clearAutoCheckBuyInterval();
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

    async batchApprove() {
        let wallets = this.state.wallets;
        let length = wallets.length;
        this.setState({approveAccount: 0})
        for (let index = 0; index < length; index++) {
            this.approve(wallets[index]);
        }
    }

    async approve(wallet) {
        try {
            loading.show();
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(WalletState.config.RPC, options));
            const tokenContract = new myWeb3.eth.Contract(ERC20_ABI, this.state.tokenIn);
            let allowance = await tokenContract.methods.allowance(wallet.address, this.state.swapRouter).call();
            allowance = new BN(allowance, 10);
            if (!allowance.isZero()) {
                this.setState({
                    approveAccount: this.state.approveAccount + 1
                });
                return;
            }
            var gasPrice = await myWeb3.eth.getGasPrice();
            console.log("gasPrice", gasPrice);
            gasPrice = new BN(gasPrice, 10).mul(new BN("120", 10)).div(new BN("100", 10));
            console.log("gasPrice", gasPrice);

            var gas = await tokenContract.methods.approve(this.state.swapRouter, MAX_INT).estimateGas({ from: wallet.address });
            gas = new BN(gas, 10).mul(new BN("120", 10)).div(new BN("100", 10));
            console.log("gas", gas);

            //Data
            var data = tokenContract.methods.approve(this.state.swapRouter, new BN(MAX_INT, 10)).encodeABI();
            console.log("data", data);

            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: WalletState.config.CHAIN_ID,
                value: Web3.utils.toHex("0"),
                to: this.state.tokenIn,
                data: data,
                from: wallet.address,
            };

            console.log("value", Web3.utils.toHex("0"));

            var fee = new BN(gas, 10).mul(new BN(gasPrice, 10));
            console.log("fee", Web3.utils.fromWei(fee, "ether"));

            console.log("txParams", txParams);

            //????????????
            let privateKey = wallet.privateKey.trim();
            console.log("privateKey", privateKey);
            var signedTx = await myWeb3.eth.accounts.signTransaction(txParams, privateKey);
            console.log("signedTx", signedTx);
            let transaction = await myWeb3.eth.sendSignedTransaction(signedTx.rawTransaction);
            //????????????
            if (!transaction.status) {
                toast.show("????????????");
                return;
            }
            console.log("?????????");
            toast.show("?????????");
            this.setState({
                approveAccount: this.state.approveAccount + 1
            });
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    async checkBuy() {
        this._checkBuy(null);
    }

    async _checkBuy(cb) {
        let account = WalletState.wallet.account;
        if (!this.state.amountIn) {
            toast.show('?????????????????????????????????');
            return;
        }
        if (!this.state.tokenInSymbol) {
            toast.show('??????????????????????????????????????????????????????????????????????????????????????????');
            return;
        }
        if (!this.state.tokenOutSymbol) {
            toast.show('??????????????????????????????????????????????????????????????????????????????????????????');
            return;
        }
        let path = [];
        let tokenIn = this.state.tokenIn;
        path.push(tokenIn);
        path.push(this.state.tokenOut);
        loading.show();
        let amountIn = toWei(this.state.amountIn, this.state.tokenInDecimals);
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenInContract = new web3.eth.Contract(ERC20_ABI, tokenIn);
            let allowance = await tokenInContract.methods.allowance(account, WalletState.config.SwapCheck).call();
            allowance = new BN(allowance, 10);
            if (allowance.isZero()) {
                let transaction = await tokenInContract.methods.approve(WalletState.config.SwapCheck, MAX_INT).send({ from: account });
                if (!transaction.status) {
                    toast.show("????????????");
                    return;
                }
            }

            const checkContract = new web3.eth.Contract(SwapCheck_ABI, WalletState.config.SwapCheck);
            let transaction = await checkContract.methods.checkBuyFee(this.state.swapRouter, amountIn, path).call({ from: account });
            let calAmountOut = new BN(transaction[0], 10);
            let buyAmountOut = new BN(transaction[1], 10);

            let buySlige = buyAmountOut.mul(new BN(10000)).div(calAmountOut);
            let showBuySlide = (10000 - buySlige.toNumber()) / 100;
            console.log(showFromWei(calAmountOut, this.tokenOutDecimals, 6));
            this.setState({
                showBuyAmount: showFromWei(buyAmountOut, this.tokenOutDecimals, 6),
                showBuySlide: showBuySlide,
                showCalAmount:showFromWei(calAmountOut, this.tokenOutDecimals, 6),
            })
            if (cb) {
                cb(buyAmountOut, showBuySlide);
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    handleTokenInChange(event) {
        let value = event.target.value;
        this.setState({
            tokenIn: value,
            tokenInDecimals: 0,
            tokenInSymbol: null,
            approveAccount: 0
        })
        this.clearAutoCheckBuyInterval();
    }

    async confirmTokenIn() {
        let tokenAddress = this.state.tokenIn;
        if (!tokenAddress) {
            toast.show('???????????????????????????????????????');
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
            let tokenSymbol = await tokenContract.methods.symbol().call();
            let tokenDecimals = await tokenContract.methods.decimals().call();
            tokenDecimals = parseInt(tokenDecimals);
            this.setState({
                tokenInDecimals: tokenDecimals,
                tokenInSymbol: tokenSymbol,
            })
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    handleAmountInChange(event) {
        let value = this.state.amountIn;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ amountIn: value });
        this.clearAutoCheckBuyInterval();
    }

    handleTokenOutChange(event) {
        let value = event.target.value;
        this.setState({
            tokenOut: value,
            tokenOutDecimals: 0,
            tokenOutSymbol: null,
        })
        this.clearAutoCheckBuyInterval();
    }

    async confirmTokenOut() {
        let tokenAddress = this.state.tokenOut;
        if (!tokenAddress) {
            toast.show('???????????????????????????????????????');
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
            let tokenSymbol = await tokenContract.methods.symbol().call();
            let tokenDecimals = await tokenContract.methods.decimals().call();
            tokenDecimals = parseInt(tokenDecimals);
            this.setState({
                tokenOutDecimals: tokenDecimals,
                tokenOutSymbol: tokenSymbol,
            })
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    handleAmountOutChange(event) {
        let value = this.state.amountOut;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ amountOut: value });
        this.clearAutoCheckBuyInterval();
    }

    async batchBuy() {
        if (!this.state.tokenInSymbol) {
            toast.show('??????????????????????????????????????????????????????????????????????????????????????????');
            return;
        }
        if (!this.state.amountIn) {
            toast.show('?????????????????????????????????');
            return;
        }
        if (!this.state.tokenOutSymbol) {
            toast.show('??????????????????????????????????????????????????????????????????????????????????????????');
            return;
        }
        if (!this.state.amountOut) {
            toast.show('???????????????????????????????????????');
            return;
        }
        let wallets = this.state.wallets;
        let length = wallets.length;
        if (length == 0) {
            toast.show('????????????????????????????????????');
            return;
        }
        for (let index = 0; index < length; index++) {
            this.buy(wallets[index]);
        }
    }

    async buy(wallet) {
        try {
            loading.show();
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(WalletState.config.RPC, options));
            const swapContract = new myWeb3.eth.Contract(SwapRouter_ABI, this.state.swapRouter);
            var gasPrice = await myWeb3.eth.getGasPrice();
            console.log("gasPrice", gasPrice);
            gasPrice = new BN(gasPrice, 10).mul(new BN("120", 10)).div(new BN("100", 10));
            console.log("gasPrice", gasPrice);

            let path = [];
            let tokenIn = this.state.tokenIn;
            path.push(tokenIn);
            path.push(this.state.tokenOut);
            let amountIn = toWei(this.state.amountIn, this.state.tokenInDecimals);
            let amountOut = toWei(this.state.amountOut, this.state.tokenOutDecimals);
            //Data
            var data = swapContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn, amountOut, path, wallet.address, 1914823077
            ).encodeABI();
            console.log("data", data);

            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            var gas = await swapContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn, amountOut, path, wallet.address, 1914823077
            ).estimateGas({ from: wallet.address });
            gas = new BN(gas, 10).mul(new BN("150", 10)).div(new BN("100", 10));
            console.log("gas", gas);

            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: WalletState.config.CHAIN_ID,
                value: Web3.utils.toHex("0"),
                to: this.state.swapRouter,
                data: data,
                from: wallet.address,
            };

            console.log("value", Web3.utils.toHex("0"));

            var fee = new BN(gas, 10).mul(new BN(gasPrice, 10));
            console.log("fee", Web3.utils.fromWei(fee, "ether"));

            //????????????
            let privateKey = wallet.privateKey;
            var signedTx = await myWeb3.eth.accounts.signTransaction(txParams, privateKey);
            console.log("signedTx", signedTx);
            console.log("txParams", txParams);
            let transaction = await myWeb3.eth.sendSignedTransaction(signedTx.rawTransaction);
            // ????????????
            if (!transaction.status) {
                toast.show("????????????");
                return;
            }
            console.log("?????????");
            toast.show("?????????");
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    _autoCheckBuyIntervel = null;
    async autoCheckThenBuy() {
        this.clearAutoCheckBuyInterval();
        if (!this.state.tokenInSymbol) {
            toast.show('??????????????????????????????????????????????????????????????????????????????????????????');
            return;
        }
        if (!this.state.amountIn) {
            toast.show('?????????????????????????????????');
            return;
        }
        if (!this.state.tokenOutSymbol) {
            toast.show('??????????????????????????????????????????????????????????????????????????????????????????');
            return;
        }
        if (!this.state.amountOut) {
            toast.show('???????????????????????????????????????');
            return;
        }
        let wallets = this.state.wallets;
        let length = wallets.length;
        if (length == 0) {
            toast.show('????????????????????????????????????');
            return;
        }
        this.setState({ auto: true })
        this._autoCheckBuyIntervel = setInterval(() => {
            this._autoCheckBuy();
        }, 1000);
    }

    async _autoCheckBuy() {
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            let path = [];
            let tokenIn = this.state.tokenIn;
            path.push(tokenIn);
            path.push(this.state.tokenOut);
            let amountIn = toWei(this.state.amountIn, this.state.tokenInDecimals);
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(WalletState.config.RPC, options));
            const checkContract = new myWeb3.eth.Contract(SwapCheck_ABI, WalletState.config.SwapCheck);
            let transaction = await checkContract.methods.checkBuyFee(this.state.swapRouter, amountIn, path).call({ from: WalletState.wallet.account });
            let calAmountOut = new BN(transaction[0], 10);
            let buyAmountOut = new BN(transaction[1], 10);

            let buySlige = buyAmountOut.mul(new BN(10000)).div(calAmountOut);
            let showBuySlide = (10000 - buySlige.toNumber()) / 100;
            console.log(showFromWei(calAmountOut, this.tokenOutDecimals, 6));
            this.setState({
                showBuyAmount: showFromWei(buyAmountOut, this.tokenOutDecimals, 6),
                showBuySlide: showBuySlide,
                showCalAmount:showFromWei(calAmountOut, this.tokenOutDecimals, 6),
            })
            this._autoBuy(buyAmountOut, showBuySlide);
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
        }
    }

    clearAutoCheckBuyInterval() {
        if (this._autoCheckBuyIntervel) {
            clearInterval(this._autoCheckBuyIntervel);
            this._autoCheckBuyIntervel = null;
            this.setState({ auto: false })
        }
    }

    async _autoBuy(buyAmountOut, showBuySlide) {
        if (showBuySlide > 30 || toWei(this.state.amountOut, this.state.tokenOutDecimals).gt(buyAmountOut)) {
            console.log('showBuySlide', showBuySlide)
            return;
        }
        this.clearAutoCheckBuyInterval();
        this.batchBuy();
    }

    render() {
        return (
            <div className="Token ImportVip">
                <Header></Header>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tokenIn} onChange={this.handleTokenInChange.bind(this)} placeholder='????????????????????????????????????' />
                    <div className='Confirm' onClick={this.confirmTokenIn.bind(this)}>??????</div>
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.amountIn} onChange={this.handleAmountInChange.bind(this)} pattern="[0-9.]*" placeholder='??????????????????????????????' />
                    <div className='Label'>{this.state.tokenInSymbol}</div>
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tokenOut} onChange={this.handleTokenOutChange.bind(this)} placeholder='????????????????????????????????????' />
                    <div className='Confirm' onClick={this.confirmTokenOut.bind(this)}>??????</div>
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.amountOut} onChange={this.handleAmountOutChange.bind(this)} pattern="[0-9.]*" placeholder='????????????????????????????????????' />
                    <div className='Label'>{this.state.tokenOutSymbol}</div>
                </div>
                <div className="button ModuleTop" onClick={this.checkBuy.bind(this)}>??????????????????</div>
                <div className='Contract Remark'>
                    ???????????????????????????{this.state.showBuySlide}????????????{this.state.showBuyAmount}{this.state.tokenOutSymbol}???0????????????{this.state.showCalAmount}{this.state.tokenOutSymbol}
                </div>

                <div className="mt20">
                    ????????????csv??????: <input type="file" onChange={this.handleFileReader} />
                </div>
                <div className="button ModuleTop" onClick={this.batchApprove.bind(this)}>???????????????????????????????????????</div>
                <div className='Contract Remark'>
                    ?????????????????????{this.state.approveAccount}
                </div>
                <div className="button2 ModuleTop" onClick={this.autoCheckThenBuy.bind(this)}>?????????????????????</div>
                {this.state.auto && <div className='Contract Remark' onClick={this.clearAutoCheckBuyInterval.bind(this)}>
                    ?????????????????????...
                </div>}
                <div className="button ModuleTop mb30" onClick={this.batchBuy.bind(this)}>??????????????????</div>
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

export default withNavigation(ScanBlock);