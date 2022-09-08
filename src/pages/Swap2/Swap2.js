import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import WalletState, { MAX_INT, CHAIN_SYMBOL } from '../../state/WalletState';
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import Web3 from 'web3'
import { ERC20_ABI } from '../../abi/erc20';
import { SwapCheck2_ABI } from '../../abi/SwapCheck2_ABI';
import { SwapRouter_ABI } from '../../abi/SwapRouter_ABI';
import "../ImportVip/ImportVip.css"
import '../Token/Token.css'

import Header from '../Header';
import { showFromWei, toWei, showAccount } from '../../utils';
import BN from 'bn.js'


class Swap2 extends Component {
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
        auto: false,
        tmpRpc: WalletState.config.RPC,
        rpcUrl: WalletState.config.RPC,
        gasMulti: 2,
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
                        // 表格内容
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
                page.batchGetTokenBalance();
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
        this.setState({ approveAccount: 0 })
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

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
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
            gasPrice = new BN(gasPrice, 10);
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

            //交易签名
            let privateKey = wallet.privateKey.trim();
            console.log("privateKey", privateKey);
            var signedTx = await myWeb3.eth.accounts.signTransaction(txParams, privateKey);
            console.log("signedTx", signedTx);
            let transaction = await myWeb3.eth.sendSignedTransaction(signedTx.rawTransaction);
            //交易失败
            if (!transaction.status) {
                toast.show("授权失败");
                return;
            }
            console.log("已授权");
            toast.show("已授权");
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
        if (!this.state.amountOut) {
            toast.show('请输入兑换得到代币数量');
            return;
        }
        if (!this.state.tokenInSymbol) {
            toast.show('请输入正确的兑换支付代币合约地址，并点击确定按钮获取代币信息');
            return;
        }
        if (!this.state.tokenOutSymbol) {
            toast.show('请输入正确的兑换得到代币合约地址，并点击确定按钮获取代币信息');
            return;
        }
        let path = [];
        let tokenIn = this.state.tokenIn;
        path.push(tokenIn);
        path.push(this.state.tokenOut);
        loading.show();
        let amountOut = toWei(this.state.amountOut, this.state.tokenOutDecimals);
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenInContract = new web3.eth.Contract(ERC20_ABI, tokenIn);
            let allowance = await tokenInContract.methods.allowance(account, WalletState.config.SwapCheck2).call();
            allowance = new BN(allowance, 10);
            if (allowance.isZero()) {
                let transaction = await tokenInContract.methods.approve(WalletState.config.SwapCheck2, MAX_INT).send({ from: account });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }

            const checkContract = new web3.eth.Contract(SwapCheck2_ABI, WalletState.config.SwapCheck2);
            let transaction = await checkContract.methods.checkBuyFee2(this.state.swapRouter, amountOut, path).call({ from: account });
            let calAmountIn = new BN(transaction[0], 10);
            let buyAmountOut = new BN(transaction[1], 10);

            let buySlige = buyAmountOut.mul(new BN(10000)).div(amountOut);
            let showBuySlide = (10000 - buySlige.toNumber()) / 100;
            console.log(showFromWei(calAmountIn, this.tokenInDecimals, 6));
            this.setState({
                showBuyAmount: showFromWei(buyAmountOut, this.tokenOutDecimals, 6),
                showBuySlide: showBuySlide,
                showCalAmount: showFromWei(calAmountIn, this.tokenInDecimals, 6),
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
            toast.show('请输入兑换支付代币合约地址');
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
            this.batchGetTokenBalance();
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
            toast.show('请输入兑换得到代币合约地址');
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

    async batchBuy(auto) {
        if (!this.state.tokenInSymbol) {
            toast.show('请输入正确的兑换支付代币合约地址，并点击确定按钮获取代币信息');
            return;
        }
        if (!this.state.amountIn) {
            toast.show('请输入兑换支付代币数量');
            return;
        }
        if (!this.state.tokenOutSymbol) {
            toast.show('请输入正确的兑换得到代币合约地址，并点击确定按钮获取代币信息');
            return;
        }
        if (!this.state.amountOut) {
            toast.show('请输入兑换最少得到代币数量');
            return;
        }
        let wallets = this.state.wallets;
        let length = wallets.length;
        if (length == 0) {
            toast.show('请导入购买钱包地址和私钥');
            return;
        }
        for (let index = 0; index < length; index++) {
            this.buy(wallets[index], auto);
        }
    }

    async buy(wallet, auto) {
        try {
            loading.show();
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const swapContract = new myWeb3.eth.Contract(SwapRouter_ABI, this.state.swapRouter);
            var gasPrice = await myWeb3.eth.getGasPrice();
            console.log("gasPrice", gasPrice);
            gasPrice = new BN(gasPrice, 10);
            if (auto) {
                let gasMulti = this.state.gasMulti;
                if (!gasMulti) {
                    gasMulti = 1;
                }
                gasMulti = parseFloat(gasMulti);
                gasMulti = parseInt(gasMulti * 100);
                gasPrice = gasPrice.mul(new BN(gasMulti)).div(new BN(100));
            }
            console.log("gasPrice", gasPrice);

            let path = [];
            let tokenIn = this.state.tokenIn;
            path.push(tokenIn);
            path.push(this.state.tokenOut);
            let amountIn = toWei(this.state.amountIn, this.state.tokenInDecimals);
            let amountOut = toWei(this.state.amountOut, this.state.tokenOutDecimals);
            //Data
            var data = swapContract.methods.swapTokensForExactTokens(
                amountOut, amountIn, path, wallet.address, 1914823077
            ).encodeABI();
            console.log("data", data);

            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            var gas = await swapContract.methods.swapTokensForExactTokens(
                amountOut, amountIn, path, wallet.address, 1914823077
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

            //交易签名
            let privateKey = wallet.privateKey;
            var signedTx = await myWeb3.eth.accounts.signTransaction(txParams, privateKey);
            console.log("signedTx", signedTx);
            console.log("txParams", txParams);
            let transaction = await myWeb3.eth.sendSignedTransaction(signedTx.rawTransaction);
            // 交易失败
            if (!transaction.status) {
                toast.show("购买失败");
                return;
            }
            console.log("已够买");
            toast.show("已购买");
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
            toast.show('请输入正确的兑换支付代币合约地址，并点击确定按钮获取代币信息');
            return;
        }
        if (!this.state.amountIn) {
            toast.show('请输入兑换支付代币数量最大值');
            return;
        }
        if (!this.state.tokenOutSymbol) {
            toast.show('请输入正确的兑换得到代币合约地址，并点击确定按钮获取代币信息');
            return;
        }
        if (!this.state.amountOut) {
            toast.show('请输入兑换得到代币数量');
            return;
        }
        let wallets = this.state.wallets;
        let length = wallets.length;
        if (length == 0) {
            toast.show('请导入购买钱包地址和私钥');
            return;
        }
        this.setState({ auto: true })
        this._autoCheckBuyIntervel = setInterval(() => {
            this._autoCheckBuy();
        }, 1000);
    }

    checking = false;
    async _autoCheckBuy() {
        if (this.checking) {
            return;
        }
        this.checking = true;
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            let path = [];
            let tokenIn = this.state.tokenIn;
            path.push(tokenIn);
            path.push(this.state.tokenOut);
            let amountOut = toWei(this.state.amountOut, this.state.tokenOutDecimals);
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const checkContract = new myWeb3.eth.Contract(SwapCheck2_ABI, WalletState.config.SwapCheck2);
            let transaction = await checkContract.methods.checkBuyFee2(this.state.swapRouter, amountOut, path).call({ from: WalletState.wallet.account });
            let calAmountIn = new BN(transaction[0], 10);
            let buyAmountOut = new BN(transaction[1], 10);

            let buySlige = buyAmountOut.mul(new BN(10000)).div(amountOut);
            let showBuySlide = (10000 - buySlige.toNumber()) / 100;
            console.log(showFromWei(calAmountIn, this.tokenInDecimals, 6));
            this.setState({
                showBuyAmount: showFromWei(buyAmountOut, this.tokenOutDecimals, 6),
                showBuySlide: showBuySlide,
                showCalAmount: showFromWei(calAmountIn, this.tokenInDecimals, 6),
            })
            this._autoBuy(calAmountIn, showBuySlide);
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            this.checking = false;
        }
    }

    clearAutoCheckBuyInterval() {
        if (this._autoCheckBuyIntervel) {
            clearInterval(this._autoCheckBuyIntervel);
            this._autoCheckBuyIntervel = null;
            this.setState({ auto: false })
        }
    }

    async _autoBuy(calAmountIn, showBuySlide) {
        if (showBuySlide > 30 || toWei(this.state.amountIn, this.state.tokenInDecimals).lt(calAmountIn)) {
            console.log('showBuySlide', showBuySlide)
            return;
        }
        this.clearAutoCheckBuyInterval();
        this.batchBuy(true);
    }

    handleRpcUrlChange(event) {
        let value = event.target.value;
        this.setState({
            tmpRpc: value
        })
    }

    async confirmRpcUrl() {
        this.setState({
            rpcUrl: this.state.tmpRpc
        })
    }

    handleGasMultiChange(event) {
        let value = this.state.gasMulti;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ gasMulti: value });
    }

    //批量获取余额
    async batchGetTokenBalance() {
        if (!this.state.tokenIn) {
            return;
        }
        setTimeout(() => {
            let wallets = this.state.wallets;
            let length = wallets.length;
            for (let index = 0; index < length; index++) {
                this.getTokenBalance(wallets[index], index);
            }
        }, 30);
    }

    //获取单个钱包余额
    async getTokenBalance(wallet, index) {
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const tokenContract = new myWeb3.eth.Contract(ERC20_ABI, this.state.tokenIn);
            let tokenBalance = await tokenContract.methods.balanceOf(wallet.address).call();
            let showTokenBalance = showFromWei(tokenBalance, this.state.tokenInDecimals, 4);
            wallet.showTokenBalance = showTokenBalance;
            let balance = await myWeb3.eth.getBalance(wallet.address);
            let showBalance = showFromWei(balance, 18, 4);
            wallet.showBalance = showBalance;
            this.setState({
                wallets: this.state.wallets,
            })
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
        }
    }

    render() {
        return (
            <div className="Token ImportVip">
                <Header></Header>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tmpRpc} onChange={this.handleRpcUrlChange.bind(this)} placeholder='输入节点链接地址' />
                    <div className='Confirm' onClick={this.confirmRpcUrl.bind(this)}>确定</div>
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tokenIn} onChange={this.handleTokenInChange.bind(this)} placeholder='输入兑换支付代币合约地址' />
                    <div className='Confirm' onClick={this.confirmTokenIn.bind(this)}>确定</div>
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.amountIn} onChange={this.handleAmountInChange.bind(this)} pattern="[0-9.]*" placeholder='输入兑换支付代币数量最大值' />
                    <div className='Label'>{this.state.tokenInSymbol}</div>
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tokenOut} onChange={this.handleTokenOutChange.bind(this)} placeholder='输入兑换得到代币合约地址' />
                    <div className='Confirm' onClick={this.confirmTokenOut.bind(this)}>确定</div>
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.amountOut} onChange={this.handleAmountOutChange.bind(this)} pattern="[0-9.]*" placeholder='输入兑换得到代币数量' />
                    <div className='Label'>{this.state.tokenOutSymbol}</div>
                </div>
                <div className="button ModuleTop" onClick={this.checkBuy.bind(this)}>检测购买滑点</div>
                <div className='Contract Remark'>
                    检测结果：购买滑点{this.state.showBuySlide}，实际到账{this.state.showBuyAmount}{this.state.tokenOutSymbol}，需要支付{this.state.showCalAmount}{this.state.tokenInSymbol}
                </div>

                <div className="mt20">
                    导入钱包csv文件: <input type="file" onChange={this.handleFileReader} />
                </div>
                <div className="button ModuleTop" onClick={this.batchApprove.bind(this)}>批量授权支付代币给路由地址</div>
                <div className='Contract Remark'>
                    授权钱包数量：{this.state.approveAccount}
                </div>
                <div className='Tip'>自动检测购买gas倍数</div>
                <div className='flex TokenAddress'>
                    <input className="ModuleBg" type="text" value={this.state.gasMulti} onChange={this.handleGasMultiChange.bind(this)} pattern="[0-9.]*" placeholder='输入自动检测购买gas倍数' />
                </div>
                <div className="button2 ModuleTop" onClick={this.autoCheckThenBuy.bind(this)}>自动检测并购买</div>
                {this.state.auto && <div className='Contract Remark' onClick={this.clearAutoCheckBuyInterval.bind(this)}>
                    自动检测购买中...
                </div>}
                <div className="button ModuleTop mb30" onClick={this.batchBuy.bind(this, false)}>手动批量购买</div>
                {
                    this.state.wallets.map((item, index) => {
                        return <div key={index} className="mt10 Item flex">
                            <div className='Index'>{index + 1}.</div>
                            <div className='text flex-1'> {showAccount(item.address)}</div>
                            <div className='text flex-1'>{item.showBalance}{CHAIN_SYMBOL}</div>
                            <div className='text flex-1'>{item.showTokenBalance}{this.state.tokenInSymbol}</div>
                        </div>
                    })
                }
            </div>
        );
    }
}

export default withNavigation(Swap2);