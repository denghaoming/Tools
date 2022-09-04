import BN from 'bn.js'
import Web3 from 'web3'

export function fromWei(wei, decimals) {
    if (!wei) {
        return "0";
    }
    var num = new BN(wei, 10).mul(new BN(10).pow(new BN(18 - decimals)));
    return Web3.utils.fromWei(num, 'ether');
}

export function toWei(n, decimals) {
    if (!n) {
        return 0;
    }
    var wei = new BN(Web3.utils.toWei(n, 'ether'), 10)
    return wei.div(new BN(10).pow(new BN(18 - decimals)));
}

export function showFromWei(wei, decimals, dots) {
    let num = fromWei(wei, decimals);
    let index = num.indexOf('.');
    if (index !== -1) {
        num = num.substring(0, dots + index + 1)
    } else {
        num = num.substring(0)
    }
    if (num.endsWith('.')) {
        num = num.substring(0, num.length - 1);
    }
    return num;
}
export function showAccount(account) {
    if (account) {
        return account.substring(0, 4) + "..." + account.substring(account.length - 4, account.length);
    }
    return "";
}

export function showCountdownTime(time) {
    if (0 >= time) {
        return ["00", "00", "00", "00"];
    }
    var second = time % 60;
    var minutes = parseInt(time / 60);
    var mitute = minutes % 60;
    var hours = parseInt(minutes / 60);
    var hour = hours % 24;
    var day = parseInt(hours / 24);
    if (day < 10) {
        day = "0" + day;
    }

    if (second < 10) {
        second = "0" + second;
    }
    if (mitute < 10) {
        mitute = "0" + mitute;
    }
    if (hour < 10) {
        hour = "0" + hour;
    }

    return [day, hour, mitute, second];
}