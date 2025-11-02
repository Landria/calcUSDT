class CurrencyCalculator {
    constructor() {
        this.rates = {
            eurToRub: 0,
            usdToRub: 0
        };
        this.isUsdMode = false;
        this.excludeTax = false;
        this.premiumAccounts = ['loki', 'lis']; // Заменить на реальный список
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        this.isPremium = code && this.premiumAccounts.some(acc => acc.toLowerCase() === code.toLowerCase());
        this.initializeElements();
        this.bindEvents();
        this.loadRates();
        setInterval(() => this.loadRates(), 30000);
        this.updateRateDisplay(); // Обновить курсы сразу после инициализации
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
        this.targetLabel = document.getElementById('targetLabel');
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
        // if (this.isPremium) {
        //     this.targetLabel.textContent = 'К получению Premium (RUB)';
        // }
    }

    bindEvents() {
        this.sourceAmountInput.addEventListener('input', () => this.calculateFromSource());
        this.targetAmountInput.addEventListener('input', () => this.calculateFromTarget());
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
        const eurCoeff = this.getCoeff(false, currentAmount);
        const usdCoeff = this.getCoeff(true, currentAmount);
        const eurRate = this.rates.eurToRub * eurCoeff * (this.isPremium ? 1 : 0.96);
        const usdRate = this.rates.usdToRub * usdCoeff * (this.isPremium ? 1 : 0.96);
        this.eurRubRateEl.textContent = eurRate ? `₽${eurRate.toFixed(4)}` : '—';
        this.usdRubRateEl.textContent = usdRate ? `₽${usdRate.toFixed(4)}` : '—';
        this.lastUpdateEl.textContent = new Date().toLocaleTimeString('ru-RU');
    }

    toggleCurrency() {
        this.isUsdMode = this.currencyToggle.checked;
        this.sourceLabel.textContent = this.isUsdMode ? 'Сумма в долларах (USD)' : 'Сумма в евро (EUR)';
        if (this.sourceAmountInput.value) this.calculateFromSource();
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
            this.recommendationAmount.textContent = '';
            return;
        }

        const result = this.calculateToRub(sourceAmount);
        this.targetAmountInput.value = result.finalAmount.toFixed(2);
        if (this.isPremium) {
            this.targetAmountInput.value = result.rubAmountBeforeTax.toFixed(2);
        }
        this.updateRecommendation(sourceAmount);
        this.updateRateDisplay();
    }

    calculateFromTarget() {
        const targetAmount = parseFloat(this.targetAmountInput.value);
        if (!targetAmount || targetAmount <= 0) {
            this.sourceAmountInput.value = '';
            this.recommendationAmount.textContent = '';
            return;
        }

        if (this.isPremium) {
            // targetAmount - rubAmountBeforeTax
            const baseRate = this.rates[this.isUsdMode ? 'usdToRub' : 'eurToRub'];
            let coeff = 0.95;
            let sourceAmount = targetAmount / (baseRate * coeff);
            let newCoeff = this.getCoeff(this.isUsdMode, sourceAmount);
            if (newCoeff !== coeff) {
                sourceAmount = targetAmount / (baseRate * newCoeff);
            }
            this.sourceAmountInput.value = sourceAmount.toFixed(2);
        } else {
            // Обычная логика с налогом
            const baseRate = this.isUsdMode ? this.rates.usdToRub : this.rates.eurToRub;
            let coeff = 0.95;
            let sourceAmount = targetAmount / (baseRate * coeff * 0.96);
            let newCoeff = this.getCoeff(this.isUsdMode, sourceAmount);
            if (newCoeff !== coeff) {
                sourceAmount = targetAmount / (baseRate * newCoeff * 0.96);
            }
            this.sourceAmountInput.value = sourceAmount.toFixed(2);
        }

        this.updateRecommendation(parseFloat(this.sourceAmountInput.value));
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
