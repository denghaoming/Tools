import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import WalletState, { MAX_INT, CHAIN_SYMBOL } from '../../state/WalletState';
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import Web3 from 'web3'
import { CK_ABI } from '../../abi/CK_ABI';
import "../ImportVip/ImportVip.css"
import '../Token/Token.css'

import Header from '../Header';
import { showFromWei, toWei, showAccount } from '../../utils';
import BN from 'bn.js'

class CK extends Component {
    state = {
        chainId: '',
        account: '',
        wallets: [],
        address: [],
        tokenIn: WalletState.config.USDT,
        tokenOut: WalletState.config.CK,
        approveAccount: 0,
        claimAccount: 0,
        addLPAccount: 0,
        tmpRpc: WalletState.config.RPC,
        rpcUrl: WalletState.config.RPC,
    }

    constructor(props) {
        super(props);
        this.handleFileReader = this.handleFileReader.bind(this);
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
                page.setState({ wallets: wallets, approveAccount: 0, claimAccount: 0, addLPAccount: 0 });
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
            const tokenContract = new myWeb3.eth.Contract(CK_ABI, this.state.tokenIn);
            let allowance = await tokenContract.methods.allowance(wallet.address, this.state.tokenOut).call();
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

            var gas = await tokenContract.methods.approve(this.state.tokenOut, MAX_INT).estimateGas({ from: wallet.address });
            gas = new BN(gas, 10).mul(new BN("120", 10)).div(new BN("100", 10));
            console.log("gas", gas);

            //Data
            var data = tokenContract.methods.approve(this.state.tokenOut, new BN(MAX_INT, 10)).encodeABI();
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

    async confirmTokenIn() {
        let tokenAddress = this.state.tokenIn;
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenContract = new web3.eth.Contract(CK_ABI, tokenAddress);
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

    async confirmTokenOut() {
        let tokenAddress = this.state.tokenOut;
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenContract = new web3.eth.Contract(CK_ABI, tokenAddress);
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

    async batchClaimAirdrop() {
        let wallets = this.state.wallets;
        let length = wallets.length;
        if (length == 0) {
            toast.show('请导入钱包地址和私钥');
            return;
        }
        this.setState({ claimAccount: 0 })
        for (let index = 0; index < length; index++) {
            this.claimAirdrop(wallets[index]);
        }
    }

    async claimAirdrop(wallet) {
        try {
            loading.show();
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const ckContract = new myWeb3.eth.Contract(CK_ABI, this.state.tokenOut);

            const userInfo = await ckContract.methods.getUserInfo(wallet.address).call();
            let pendingAmount = new BN(userInfo[5], 10);

            if (pendingAmount.isZero()) {
                this.setState({ claimAccount: this.state.claimAccount + 1 });
                return;
            }


            var gasPrice = await myWeb3.eth.getGasPrice();
            console.log("gasPrice", gasPrice);
            gasPrice = new BN(gasPrice, 10);
            //Data
            var data = ckContract.methods.claimAirdrop().encodeABI();
            console.log("data", data);

            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            var gas = await ckContract.methods.claimAirdrop().estimateGas({ from: wallet.address });
            gas = new BN(gas, 10).mul(new BN("120", 10)).div(new BN("100", 10));
            console.log("gas", gas);

            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: WalletState.config.CHAIN_ID,
                value: Web3.utils.toHex("0"),
                to: this.state.tokenOut,
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
                toast.show("领取失败");
                return;
            }
            console.log("已领取");
            toast.show("已领取");
            this.setState({ claimAccount: this.state.claimAccount + 1 })
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //批量获取余额
    async batchGetTokenBalance() {
        if (!this.state.tokenInSymbol) {
            return;
        }
        if (!this.state.tokenOutSymbol) {
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
            //USDT
            const tokenContract = new myWeb3.eth.Contract(CK_ABI, this.state.tokenIn);
            let tokenBalance = await tokenContract.methods.balanceOf(wallet.address).call();
            let showTokenBalance = showFromWei(tokenBalance, this.state.tokenInDecimals, 4);
            wallet.tokenBalance = tokenBalance;
            wallet.showTokenBalance = showTokenBalance;
            //CK
            const tokenOutContract = new myWeb3.eth.Contract(CK_ABI, this.state.tokenOut);
            let tokenOutBalance = await tokenOutContract.methods.balanceOf(wallet.address).call();
            let showTokenOutBalance = showFromWei(tokenOutBalance, this.state.tokenOutDecimals, 4);
            wallet.tokenOutBalance = new BN(tokenOutBalance, 10);
            wallet.showTokenOutBalance = showTokenOutBalance;
            //BNB
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


    async batchAddLP() {
        let wallets = this.state.wallets;
        let length = wallets.length;
        this.setState({ addLPAccount: 0 })
        for (let index = 0; index < length; index++) {
            this.addLP(wallets[index]);
        }
    }

    async addLP(wallet) {
        try {
            loading.show();
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const ckContract = new myWeb3.eth.Contract(CK_ABI, this.state.tokenOut);

            let addLPUsdtAmount = await ckContract.methods.getAddLPUsdtAmount(wallet.tokenOutBalance).call();
            console.log("addLPUsdtAmount",addLPUsdtAmount);
            addLPUsdtAmount = new BN(addLPUsdtAmount, 10);
            if (addLPUsdtAmount.isZero()) {
                this.setState({ addLPAccount: this.state.addLPAccount + 1 });
                return;
            }

            var gasPrice = await myWeb3.eth.getGasPrice();
            console.log("gasPrice", gasPrice);
            gasPrice = new BN(gasPrice, 10);
            //Data
            var data = ckContract.methods.addUSDTLP(addLPUsdtAmount, wallet.tokenOutBalance).encodeABI();
            console.log("data", data);

            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            var gas = await ckContract.methods.addUSDTLP(addLPUsdtAmount, wallet.tokenOutBalance).estimateGas({ from: wallet.address });
            gas = new BN(gas, 10).mul(new BN("120", 10)).div(new BN("100", 10));
            console.log("gas", gas);

            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: WalletState.config.CHAIN_ID,
                value: Web3.utils.toHex("0"),
                to: this.state.tokenOut,
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
                toast.show("添加池子失败");
                return;
            }
            console.log("已添加池子");
            toast.show("已添加池子");
            this.setState({ addLPAccount: this.state.addLPAccount + 1 })
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
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tmpRpc} onChange={this.handleRpcUrlChange.bind(this)} placeholder='输入节点链接地址' />
                    <div className='Confirm' onClick={this.confirmRpcUrl.bind(this)}>确定</div>
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tokenIn} />
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tokenOut} />
                </div>
                <div className="mt20">
                    导入钱包csv文件: <input type="file" onChange={this.handleFileReader} />
                </div>

                <div className="button ModuleTop" onClick={this.batchClaimAirdrop.bind(this)}>批量领取{this.state.tokenOutSymbol}空投</div>
                <div className='Contract Remark'>
                    领取钱包数量：{this.state.claimAccount}
                </div>

                <div className="button ModuleTop" onClick={this.batchApprove.bind(this)}>批量授权{this.state.tokenInSymbol}给合约地址</div>
                <div className='Contract Remark'>
                    授权钱包数量：{this.state.approveAccount}
                </div>

                <div className="button ModuleTop" onClick={this.batchAddLP.bind(this)}>批量加池子</div>
                <div className='Contract Remark'>
                    加池子钱包数量：{this.state.addLPAccount}
                </div>

                <div className="button ModuleTop mb20" onClick={this.batchGetTokenBalance.bind(this)}>刷新钱包余额</div>
                {
                    this.state.wallets.map((item, index) => {
                        return <div key={index} className="mt10 Item flex">
                            <div className='Index'>{index + 1}.</div>
                            <div className='text flex-1'> {showAccount(item.address)}</div>
                            <div className='text flex-1'>{item.showBalance}{CHAIN_SYMBOL}</div>
                            <div className='text flex-1'>{item.showTokenBalance}{this.state.tokenInSymbol}</div>
                            <div className='text flex-1'>{item.showTokenOutBalance}{this.state.tokenOutSymbol}</div>
                        </div>
                    })
                }
            </div>
        );
    }
}

export default withNavigation(CK);