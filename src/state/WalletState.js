import Web3 from 'web3'
import { CHAIN_ID, CHAIN_SYMBOL, CHAIN_ERROR_TIP } from '../abi/config'
import toast from '../components/toast/toast'
class WalletState {
    wallet = {
        chainId: null,
        account: null,
        lang: "EN"
    }

    config = {
        //Heco
        // Token: "0x7AC046d8F88D2F322034B3c75f87c767E618A7D3",
        // MultiSend: "0xeEA1dcbF5Ea34a09541fd1Ad1d4dDA00Cd6be6b8",
        // Invitor: "0xC44F16045D94049284FE4E27ec8D46Ea4bE26560",
        // RPC: 'https://http-mainnet.hecochain.com/',
        // CHAIN_ID: 128,
        // SwapCheck: "0x1BeB472Cc1ddc5Dae1bB2Ddd38A101A2fad3584c",
        // USDT:'0xa22b5A5118c1d05d0D4c8f1B808DBa22ee17dD8E',
        // SwapRouter:"0xBe4AB2603140F134869cb32aB4BC56d762Ae900B",
        // SwapCheck2:"0xB4D8Ab17B5315D1B9c5af91aC06cdA2553aa8A8F",
        //BSC
        Token: "0x8333a84f6905bF66A591572bF220A8dBe45606eC",
        MultiSend:"0xdf73469E83c2001104D4FF96BDA594C74271EB34",
        Invitor:"0xa3E4bf0eBAC1f1BB462F990f12420655348822bc",
        RPC:'https://bsc-dataseed1.binance.org/',
        CHAIN_ID:56,
        USDT:'0x55d398326f99059fF775485246999027B3197955',
        SwapRouter:"0x10ED43C718714eb63d5aA57B78B54704E256024E",
        SwapCheck: "0xe21AFca4174F5b2fc8FBFC5BD06164805bE93717",
        SwapCheck2:"0x3712B77abF2438BcB2BAc32A6B60D831bB8A1471",
        CK:"0xb436F7af2F269881dbc31B0afdFb597705E1aa6a",
    }

    listeners = []

    constructor() {
        this.subcripeWeb3();
        this.getConfig();
    }
    //listen the wallet event
    async subcripeWeb3() {
        let page = this;
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', function (accounts) {
                page.connetWallet();
                // window.location.reload();
            });
            window.ethereum.on('chainChanged', function (chainId) {
                page.connetWallet();
                page.getConfig();
                // window.location.reload();
            });
        }
        // window.ethereum.on('connect', (connectInfo) => { });
        // window.ethereum.on('disconnect', (err) => { });
        // window.ethereum.isConnected();

        //         4001
        // The request was rejected by the user
        // -32602
        // The parameters were invalid
        // -32603
        // Internal error
    }

    async getConfig() {
        if (!Web3.givenProvider) {
            console.log("not wallet found");
        }

        var storage = window.localStorage;
        if (storage) {
            var lang = storage["lang"];
            if (lang) {
                this.wallet.lang = lang;
            }
        }
        console.log("config", this.config);
        this.notifyAll();
    }

    async connetWallet() {
        let provider = Web3.givenProvider || window.ethereum;
        console.log("provider", provider);
        if (provider) {
            Web3.givenProvider = provider;
            const web3 = new Web3(provider);
            const chainId = await web3.eth.getChainId();
            console.log(chainId);
            this.wallet.chainId = chainId;
            const accounts = await web3.eth.requestAccounts();
            console.log('accounts');
            console.log(accounts);
            this.wallet.account = accounts[0];
            this.notifyAll();
        } else {
            setTimeout(() => {
                this.connetWallet();
            }, 3000);
            // window.location.reload();
        }
    }

    changeLang(lang) {
        this.wallet.lang = lang;
        var storage = window.localStorage;
        if (storage) {
            storage["lang"] = lang;
        }
        this.notifyAll();
    }

    onStateChanged(cb) {
        this.listeners.push(cb);
    }

    removeListener(cb) {
        this.listeners = this.listeners.filter(item => item !== cb);
    }

    notifyAll() {
        for (let i = 0; i < this.listeners.length; i++) {
            const cb = this.listeners[i];
            cb();
        }
    }

}
export { CHAIN_ID, CHAIN_SYMBOL, CHAIN_ERROR_TIP };
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const MAX_INT = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
export default new WalletState();