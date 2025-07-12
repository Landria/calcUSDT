class CurrencyCalculator {
    constructor() {
        this.rates = {
            usdtEur: 0,
            usdtRub: 0 // теперь с Binance P2P
        };
        this.isUsdMode = false;
        this.usdCoefficient = 1.052;
        this.excludeTax = false;
        this.initializeElements();
        this.bindEvents();
        this.loadRates();
        setInterval(() => this.loadRates(), 30000);
    }
    initializeElements() {
        this.sourceAmountInput = document.getElementById('sourceAmount');
        this.targetAmountInput = document.getElementById('targetAmount');
        this.currencyToggle = document.getElementById('currencyToggle');
        this.sourceLabel = document.getElementById('sourceLabel');
        this.errorMessage = document.getElementById('errorMessage');
        this.breakdown = document.getElementById('breakdown');
        this.breakdownToggle = document.getElementById('breakdownToggle');
        this.totalCommissionEl = document.getElementById('totalCommissionValue');
        this.recommendationAmount = document.getElementById('recommendationAmount');
        this.usdtEurRateEl = document.getElementById('usdtEurRate');
        this.usdtRubRateEl = document.getElementById('usdtRubRate');
        this.eurUsdtRateEl = document.getElementById('eurUsdtRate');
        this.eurRubRateEl = document.getElementById('eurRubRate');
        this.lastUpdateEl = document.getElementById('lastUpdate');
        this.depositFeeEl = document.getElementById('depositFee');
        this.cryptoFeeEl = document.getElementById('cryptoFee');
        this.agentFeeEl = document.getElementById('agentFee');
        this.withdrawFeeEl = document.getElementById('withdrawFee');
        this.taxFeeEl = document.getElementById('taxFee');
        this.reserveFeeEl = document.getElementById('reserveFee');
        this.finalAmountEl = document.getElementById('finalAmount');
    }
    bindEvents() {
        this.sourceAmountInput.addEventListener('input', () => this.calculateFromSource());
        this.targetAmountInput.addEventListener('input', () => this.calculateFromTarget());
        this.currencyToggle.addEventListener('change', () => this.toggleCurrency());
        this.breakdownToggle.addEventListener('click', () => this.toggleBreakdown());
    }
    async loadRates() {
        const min = 76.01;
        const max = 78.76;
        // Получаем случайное число в диапазоне и округляем до двух знаков после запятой
        const rubRateDefault = (Math.random() * (max - min) + min).toFixed(2);
        
        try {
            // Получаем курс USDT/EUR с Bybit (API)
            const eurResponse = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=USDTEUR');
            if (eurResponse.ok) {
                const eurData = await eurResponse.json();
                if (eurData.result && eurData.result.list && eurData.result.list.length > 0) {
                    this.rates.usdtEur = parseFloat(eurData.result.list[0].lastPrice);
                }
            }

            // Получаем курс USDT/RUB с вашего сервера
            const rubResponse = await fetch('/rate');
            if (rubResponse.ok) {
                const rubText = await rubResponse.text();
                this.rates.usdtRub = parseFloat(rubText);
                console.log("Курс USDT/RUB:", this.rates.usdtRub - 10);
            }

            // Фолбэк, если не удалось получить значения
            if (!this.rates.usdtEur) this.rates.usdtEur = 0.8556;
            if (!this.rates.usdtRub) this.rates.usdtRub = 77.01;

            this.updateRateDisplay();
            this.hideError();
        } catch (error) {
            this.showError('Не удалось загрузить актуальные курсы. Используются примерные значения. За точным рассчётом рекомендуем обратитсья к автору!');
            this.rates.usdtEur = 0.8556;
            this.rates.usdtRub = 77.01;
            this.updateRateDisplay();
        }
    }

    updateRateDisplay() {
        const eurUsdt = this.rates.usdtEur > 0 ? (1 / this.rates.usdtEur) : 0;
        const eurRub = eurUsdt * this.rates.usdtRub;
        this.eurUsdtRateEl.textContent = eurUsdt ? eurUsdt.toFixed(6) : '—';
        this.usdtRubRateEl.textContent = `₽${this.rates.usdtRub.toFixed(2)}`;
        this.eurRubRateEl.textContent = eurRub ? `₽${eurRub.toFixed(4)}` : '—';
        this.lastUpdateEl.textContent = new Date().toLocaleTimeString('ru-RU');
    }
    toggleCurrency() {
        this.isUsdMode = this.currencyToggle.checked;
        this.sourceLabel.textContent = this.isUsdMode ? 'Сумма в долларах (USD)' : 'Сумма в евро (EUR)';
        if (this.sourceAmountInput.value) this.calculateFromSource();
    }
    toggleBreakdown() {
        const expanded = this.breakdown.classList.contains('breakdown-expanded');
        if (expanded) {
            this.breakdown.classList.remove('breakdown-expanded');
            this.breakdown.classList.add('breakdown-collapsed');
            this.breakdownToggle.classList.add('collapsed');
            this.breakdownToggle.querySelector('.collapse-arrow').style.transform = 'rotate(-90deg)';
        } else {
            this.breakdown.classList.remove('breakdown-collapsed');
            this.breakdown.classList.add('breakdown-expanded');
            this.breakdownToggle.classList.remove('collapsed');
            this.breakdownToggle.querySelector('.collapse-arrow').style.transform = 'rotate(0deg)';
        }
    }
    calculateFromSource() {
        const sourceAmount = parseFloat(this.sourceAmountInput.value);
        if (!sourceAmount || sourceAmount <= 0) {
            this.targetAmountInput.value = '';
            this.breakdown.classList.add('breakdown-collapsed');
            this.breakdown.classList.remove('breakdown-expanded');
            this.breakdownToggle.classList.add('collapsed');
            this.recommendationAmount.textContent = '';
            return;
        }
        let eurAmount = sourceAmount;
        if (this.isUsdMode) eurAmount = sourceAmount / this.usdCoefficient;
        const result = this.calculateEurToRub(eurAmount, this.excludeTax);
        this.targetAmountInput.value = result.finalAmount.toFixed(2);
        this.updateBreakdown(result, sourceAmount);
        this.updateRecommendation(sourceAmount);
    }
    calculateFromTarget() {
        const targetAmount = parseFloat(this.targetAmountInput.value);
        if (!targetAmount || targetAmount <= 0) {
            this.sourceAmountInput.value = '';
            this.breakdown.classList.add('breakdown-collapsed');
            this.breakdown.classList.remove('breakdown-expanded');
            this.breakdownToggle.classList.add('collapsed');
            this.recommendationAmount.textContent = '';
            return;
        }
        let eurAmount = this.estimateEurFromRub(targetAmount, this.excludeTax);
        for (let i = 0; i < 5; i++) {
            const result = this.calculateEurToRub(eurAmount, this.excludeTax);
            const difference = targetAmount - result.finalAmount;
            if (Math.abs(difference) < 0.01) break;
            eurAmount += difference / (this.rates.usdtRub / this.rates.usdtEur * 0.85);
        }
        let sourceAmount = eurAmount;
        if (this.isUsdMode) sourceAmount = eurAmount * this.usdCoefficient;
        this.sourceAmountInput.value = sourceAmount.toFixed(2);
        const result = this.calculateEurToRub(eurAmount, this.excludeTax);
        this.updateBreakdown(result, sourceAmount);
        this.updateRecommendation(sourceAmount);
    }
    calculateEurToRub(eurAmount, excludeTax) {
        const depositFee = Math.max(eurAmount * 0.0019, 1);
        const cryptoFee = eurAmount * 0.001; // 0.1%
        const agentFee = Math.max(eurAmount * 0.01, 1); // 1% или минимум 1 евро
        const eurAfterFees = eurAmount - depositFee - cryptoFee - agentFee;
        const usdtAmount = eurAfterFees / this.rates.usdtEur;
        const usdtAfterWithdraw = usdtAmount - 1;
        let rubAmount = usdtAfterWithdraw * this.rates.usdtRub;
        let taxAmount = 0;
        if (!excludeTax) {
            taxAmount = rubAmount * 0.04;
            rubAmount -= taxAmount;
        }
        const reserveAmount = rubAmount * 0.01;
        const finalAmount = rubAmount - reserveAmount;

        let totalCommission = depositFee + cryptoFee + agentFee + (1 * this.rates.usdtEur);
        if (!excludeTax) totalCommission += (taxAmount / this.rates.usdtRub * this.rates.usdtEur);
        totalCommission += (reserveAmount / this.rates.usdtRub * this.rates.usdtEur);

        return {
            depositFee, cryptoFee, agentFee, withdrawFee: 1, taxAmount, reserveAmount,
            finalAmount: Math.max(0, finalAmount),
            totalCommission: totalCommission,
            eurAmount
        };
    }
    estimateEurFromRub(rubAmount, excludeTax) {
        let estimatedUsdt = rubAmount / this.rates.usdtRub;
        if (!excludeTax) estimatedUsdt /= 0.95;
        else estimatedUsdt /= 0.99;
        const estimatedEur = (estimatedUsdt + 1) * this.rates.usdtEur;
        return estimatedEur / 0.85;
    }
    updateBreakdown(result, sourceAmount) {
        this.totalCommissionEl.textContent = `~€${result.totalCommission.toFixed(2)}`;
        // Добавьте строку ниже:
        document.getElementById('commissionPercentValue').textContent = (result.eurAmount > 0)
            ? (result.totalCommission / result.eurAmount * 100).toFixed(2)
            : '-';
        this.depositFeeEl.textContent = `€${result.depositFee.toFixed(2)}`;
        this.cryptoFeeEl.textContent = `€${result.cryptoFee.toFixed(2)}`;
        this.agentFeeEl.textContent = `€${result.agentFee.toFixed(2)}`;
        this.withdrawFeeEl.textContent = `${result.withdrawFee} USDT`;
        this.taxFeeEl.textContent = `₽${result.taxAmount.toFixed(2)}`;
        this.reserveFeeEl.textContent = `₽${result.reserveAmount.toFixed(2)}`;
        this.finalAmountEl.textContent = `₽${result.finalAmount.toFixed(2)}`;
        this.breakdown.classList.add('breakdown-collapsed');
        this.breakdown.classList.remove('breakdown-expanded');
        this.breakdownToggle.classList.add('collapsed');
        this.breakdownToggle.querySelector('.collapse-arrow').style.transform = 'rotate(-90deg)';
    }
    updateRecommendation(sourceAmount) {
        if (!sourceAmount || sourceAmount <= 0) {
            this.recommendationAmount.textContent = '';
            return;
        }
        const rounded = Math.ceil(sourceAmount);
        this.recommendationAmount.textContent = `Рекомендуемая сумма для перевода: ${this.isUsdMode ? '$' : '€'}${rounded}`;
    }
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }
    hideError() {
        this.errorMessage.style.display = 'none';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new CurrencyCalculator();
});
