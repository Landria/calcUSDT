class CurrencyCalculator {
    constructor() {
        this.rates = {
            eurToRub: 0,
            usdToRub: 0
        };
        this.isUsdMode = false;
        this.excludeTax = false;
        this.initializeElements();
        this.bindEvents();
        this.loadRates();
        setInterval(() => this.loadRates(), 30000);
    }

    getCoeff(isUsd, amount) {
        if (amount < 25) return isUsd ? 0.83 : 0.85;
        else if (amount <= 50) return isUsd ? 0.85 : 0.87;
        else if (amount <= 100) return isUsd ? 0.90 : 0.92;
        else if (amount <= 200) return isUsd ? 0.93 : 0.95;
        else if (amount <= 400) return isUsd ? 0.947 : 0.967;
        else return isUsd ? 0.954 : 0.974;
    }

    initializeElements() {
        this.sourceAmountInput = document.getElementById('sourceAmount');
        this.targetAmountInput = document.getElementById('targetAmount');
        this.currencyToggle = document.getElementById('currencyToggle');
        this.sourceLabel = document.getElementById('sourceLabel');
        this.errorMessage = document.getElementById('errorMessage');
        // this.breakdown = document.getElementById('breakdown');
        // this.breakdownToggle = document.getElementById('breakdownToggle');
        this.eurRubRateEl = document.getElementById('eurRubRate');
        this.usdRubRateEl = document.getElementById('usdRubRate');
        this.lastUpdateEl = document.getElementById('lastUpdate');
        this.taxFeeEl = document.getElementById('taxFee');
        this.finalAmountEl = document.getElementById('finalAmount');
        this.finalAmountNoTaxEl = document.getElementById('finalAmountNoTax');
        this.recommendationAmount = document.getElementById('recommendationAmount');
        this.amountWithoutTaxEl = document.getElementById('amountWithoutTax');
    }

    bindEvents() {
        this.sourceAmountInput.addEventListener('input', () => this.calculateFromSource());
        this.targetAmountInput.addEventListener('input', () => this.calculateFromTarget());
        this.amountWithoutTaxEl.addEventListener('input', () => this.calculateFromAmountWithoutTax());
        this.currencyToggle.addEventListener('change', () => this.toggleCurrency());
        // this.breakdownToggle.addEventListener('click', () => this.toggleBreakdown());
    }

    // Функция-обработчик для JSONP от ЦБ РФ
    CBR_XML_Daily_Ru(rates) {
        this.rates.eurToRub = rates.Valute.EUR.Value;
        this.rates.usdToRub = rates.Valute.USD.Value;
        this.updateRateDisplay();
        this.hideError();
        console.log('Курсы ЦБ РФ загружены:', this.rates);
    }

    async loadRates() {
        try {
            // Подключаем JSONP скрипт для получения курсов ЦБ РФ
            if (!window.CBR_XML_Daily_Ru) {
                window.CBR_XML_Daily_Ru = (rates) => this.CBR_XML_Daily_Ru(rates);
            }

            // Создаем новый script элемент для обновления данных
            const script = document.createElement('script');
            script.src = 'https://www.cbr-xml-daily.ru/daily_jsonp.js';
            script.async = true;
            document.head.appendChild(script);

            // Удаляем старый скрипт через секунду
            setTimeout(() => {
                document.head.removeChild(script);
            }, 1000);

        } catch (error) {
            this.showError('Не удалось загрузить актуальные курсы ЦБ РФ. Используются примерные значения.');
            // Фолбэк значения
            this.rates.eurToRub = 85.00;
            this.rates.usdToRub = 75.00;
            this.updateRateDisplay();
        }
    }

    updateRateDisplay() {
        const currentAmount = parseFloat(this.sourceAmountInput.value) || 100;
        this.eurRubRateEl.textContent = this.getEurRate(currentAmount) ? `₽${this.getEurRate(currentAmount).toFixed(4)}` : '—';
        this.usdRubRateEl.textContent = this.getUsdRate(currentAmount) ? `₽${this.getUsdRate(currentAmount).toFixed(4)}` : '—';
        this.lastUpdateEl.textContent = new Date().toLocaleTimeString('ru-RU');
    }

    toggleCurrency() {
        this.isUsdMode = this.currencyToggle.checked;
        this.sourceLabel.textContent = this.isUsdMode ? 'Сумма в долларах (USD)' : 'Сумма в евро (EUR)';
        if (this.sourceAmountInput.value) this.calculateFromSource();
        if (this.amountWithoutTaxEl.value) this.calculateFromAmountWithoutTax();
        this.updateRateDisplay();
    }

    // toggleBreakdown() {
    //     const expanded = this.breakdown.classList.contains('breakdown-expanded');
    //     if (expanded) {
    //         this.breakdown.classList.remove('breakdown-expanded');
    //         this.breakdown.classList.add('breakdown-collapsed');
    //         this.breakdownToggle.classList.add('collapsed');
    //         this.breakdownToggle.querySelector('.collapse-arrow').style.transform = 'rotate(-90deg)';
    //     } else {
    //         this.breakdown.classList.remove('breakdown-collapsed');
    //         this.breakdown.classList.add('breakdown-expanded');
    //         this.breakdownToggle.classList.remove('collapsed');
    //         this.breakdownToggle.querySelector('.collapse-arrow').style.transform = 'rotate(0deg)';
    //     }
    // }

    calculateFromSource() {
        const sourceAmount = parseFloat(this.sourceAmountInput.value);
        if (!sourceAmount || sourceAmount <= 0) {
            this.targetAmountInput.value = '';
            // this.breakdown.classList.add('breakdown-collapsed');
            // this.breakdown.classList.remove('breakdown-expanded');
            // this.breakdownToggle.classList.add('collapsed');
            this.amountWithoutTaxEl.value = '';
            this.recommendationAmount.textContent = '';
            return;
        }

        const result = this.calculateToRub(sourceAmount);
        this.targetAmountInput.value = result.finalAmount.toFixed(2);
        this.amountWithoutTaxEl.value = result.rubAmountBeforeTax.toFixed(2);
        // this.updateBreakdown(result, sourceAmount);
        this.updateRecommendation(sourceAmount);
        this.updateRateDisplay();
    }

    calculateFromTarget() {
        const targetAmount = parseFloat(this.targetAmountInput.value);
        if (!targetAmount || targetAmount <= 0) {
            this.sourceAmountInput.value = '';
            // this.breakdown.classList.add('breakdown-collapsed');
            // this.breakdown.classList.remove('breakdown-expanded');
            // this.breakdownToggle.classList.add('collapsed');
            this.amountWithoutTaxEl.value = '';
            this.recommendationAmount.textContent = '';
            return;
        }

        // Обратный расчет с учетом налога
        let sourceAmount;
        if (this.isUsdMode) {
            // Для USD
            const baseRate = this.rates.usdToRub;
            const sourceAmountApprox = targetAmount / (baseRate * 0.96 * 0.95);
            const coeff = this.getCoeff(true, sourceAmountApprox);
            sourceAmount = targetAmount / (baseRate * coeff * 0.96);
        } else {
            // Для EUR
            const baseRate = this.rates.eurToRub;
            const sourceAmountApprox = targetAmount / (baseRate * 0.96 * 0.95);
            const coeff = this.getCoeff(false, sourceAmountApprox);
            sourceAmount = targetAmount / (baseRate * coeff * 0.96);
        }

        this.sourceAmountInput.value = sourceAmount.toFixed(2);
        const result = this.calculateToRub(sourceAmount);
        this.amountWithoutTaxEl.value = result.rubAmountBeforeTax.toFixed(2);
        // this.updateBreakdown(result, sourceAmount);
        this.updateRecommendation(sourceAmount);
        this.updateRateDisplay();
    }

    calculateFromAmountWithoutTax() {
        const amountWithoutTax = parseFloat(this.amountWithoutTaxEl.value);
        if (!amountWithoutTax || amountWithoutTax <= 0) {
            this.sourceAmountInput.value = '';
            this.targetAmountInput.value = '';
            this.recommendationAmount.textContent = '';
            return;
        }

        const isUsd = this.isUsdMode;
        const baseRate = isUsd ? this.rates.usdToRub : this.rates.eurToRub;
        const rateApprox = baseRate * 0.96;
        const sourceAmountApprox = amountWithoutTax / rateApprox;
        const rate = isUsd ? this.getUsdRate(sourceAmountApprox) : this.getEurRate(sourceAmountApprox);
        const sourceAmount = amountWithoutTax / rate;
        this.sourceAmountInput.value = sourceAmount.toFixed(2);

        const finalAmount = amountWithoutTax * 0.96;
        this.targetAmountInput.value = finalAmount.toFixed(2);

        this.updateRecommendation(sourceAmount);
        this.updateRateDisplay();
    }

    calculateToRub(sourceAmount) {
        let rubAmount;

        if (this.isUsdMode) {
            rubAmount = sourceAmount * this.getUsdRate(sourceAmount);
        } else {
            rubAmount = sourceAmount * this.getEurRate(sourceAmount);
        }

        // Рассчитываем налог 4%
        const taxAmount = rubAmount * 0.04;
        const finalAmount = rubAmount - taxAmount;

        return {
            rubAmountBeforeTax: rubAmount,
            taxAmount: taxAmount,
            finalAmount: Math.max(0, finalAmount),
            sourceAmount: sourceAmount
        };
    }

    updateBreakdown(result, sourceAmount) {
        this.taxFeeEl.textContent = `₽${result.taxAmount.toFixed(2)}`;
        this.finalAmountEl.textContent = `₽${result.finalAmount.toFixed(2)}`;
        this.finalAmountNoTaxEl.textContent = `₽${result.rubAmountBeforeTax.toFixed(2)}`;

        // this.breakdown.classList.add('breakdown-collapsed');
        // this.breakdown.classList.remove('breakdown-expanded');
        // this.breakdownToggle.classList.add('collapsed');
        // this.breakdownToggle.querySelector('.collapse-arrow').style.transform = 'rotate(-90deg)';
    }

    updateRecommendation(sourceAmount) {
        if (!sourceAmount || sourceAmount <= 0) {
            this.recommendationAmount.textContent = '';
            return;
        }

        const adjustment = (!this.isUsdMode && sourceAmount < 50) ? 0 : 0;
        const rounded = Math.ceil(sourceAmount + adjustment);
        this.recommendationAmount.textContent = `Рекомендуемая сумма для перевода: ${this.isUsdMode ? '$' : '€'}${rounded}`;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    getEurRate(amount = 100) {
        return this.rates.eurToRub * this.getCoeff(false, amount);
    }

    // Получить курс USD с коэффициентом
    getUsdRate(amount = 100) {
        return this.rates.usdToRub * this.getCoeff(true, amount);
    }
}

// Глобальная функция для JSONP callback
function CBR_XML_Daily_Ru(rates) {
    if (window.calculator) {
        window.calculator.CBR_XML_Daily_Ru(rates);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new CurrencyCalculator();
});
