import store from '../store/index'

function formatNumber(decimalCount, amount, symbol, thousands, decimal) {
    try {

        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = amount < 0 ? "-" : "";

        let i = parseInt(
            (amount = Math.abs(Number(amount) || 0).toFixed(decimalCount))
        ).toString();
        let j = i.length > 3 ? i.length % 3 : 0;

        return (
            `${symbol} ` +
            negativeSign +
            (j ? i.substr(0, j) + thousands : "") +
            i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) +
            (decimalCount
                ? decimal +
                Math.abs(amount - i)
                    .toFixed(decimalCount)
                    .slice(2)
                : "")
        );
    } catch (e) {
        console.error(e);
    }
}

export const utils = {
    toPascalCase(string) {
        return string
            .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
            .replace(/^\w/, s => s.toUpperCase());
    },
    cutLength(string, limit = 45) {
        if (string.length < limit) {
            return string
        } else {
            return string.toString().substring(0, limit).concat('...')
        }
    },
    formatMoney(amount, decimalCount = 2, decimal = ".", thousands = ",", isCurrency = true) {
        amount = this.roundAmount(amount,decimalCount);
        return formatNumber(decimalCount, amount, '', thousands, decimal);
    },

    formatQTY(amount) {
        amount = this.roundAmount(amount,0);
        return this.formatMoney(amount, 0, '.', ',',false);
    },

    roundAmount(amount , decimalPlaces = 2){
        if (typeof amount === 'string'){
            amount = amount.replace(`,`,``);
            amount = Number(amount);
        }
        amount = amount.toFixed(decimalPlaces);
        return Number(amount);
    },

    removeIf(arr, predicate) {
        return arr.filter(predicate);
    },
    remove(arr, obj) {
        return arr.filter(v => v !== obj)
    },



    getNow() {
        let date = new Date();
        return date.toISOString().split('T')[0];
    },

    showLoading: () => store.commit(`setLoadingState`, true),
    hideLoading: () => store.commit(`setLoadingState`, false),
}

