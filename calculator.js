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
        this.coefficients = {
            eurCoeff: 0.88,
            usdCoeff: 0.85
        };
        setInterval(() => this.loadRates(), 30000);
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
        this.eurRubRateEl.textContent = this.getEurRate() ? `₽${this.getEurRate().toFixed(4)}` : '—';
        this.usdRubRateEl.textContent = this.getUsdRate() ? `₽${this.getUsdRate().toFixed(4)}` : '—';
        this.lastUpdateEl.textContent = new Date().toLocaleTimeString('ru-RU');
    }

    toggleCurrency() {
        this.isUsdMode = this.currencyToggle.checked;
        this.sourceLabel.textContent = this.isUsdMode ? 'Сумма в долларах (USD)' : 'Сумма в евро (EUR)';
        if (this.sourceAmountInput.value) this.calculateFromSource();
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
            this.recommendationAmount.textContent = '';
            return;
        }

        const result = this.calculateToRub(sourceAmount);
        this.targetAmountInput.value = result.finalAmount.toFixed(2);
        // this.updateBreakdown(result, sourceAmount);
        this.updateRecommendation(sourceAmount);
    }

    calculateFromTarget() {
        const targetAmount = parseFloat(this.targetAmountInput.value);
        if (!targetAmount || targetAmount <= 0) {
            this.sourceAmountInput.value = '';
            // this.breakdown.classList.add('breakdown-collapsed');
            // this.breakdown.classList.remove('breakdown-expanded');
            // this.breakdownToggle.classList.add('collapsed');
            this.recommendationAmount.textContent = '';
            return;
        }

        // Обратный расчет с учетом налога
        let sourceAmount;
        if (this.isUsdMode) {
            // Для USD
            sourceAmount = targetAmount / (this.getUsdRate() * 0.96); // 4% налог
        } else {
            // Для EUR
            sourceAmount = targetAmount / (this.getEurRate() * 0.96); // 4% налог
        }

        this.sourceAmountInput.value = sourceAmount.toFixed(2);
        // const result = this.calculateToRub(sourceAmount);
        // this.updateBreakdown(result, sourceAmount);
        this.updateRecommendation(sourceAmount);
    }

    calculateToRub(sourceAmount) {
        let rubAmount;

        if (this.isUsdMode) {
            rubAmount = sourceAmount * this.getUsdRate();
        } else {
            rubAmount = sourceAmount * this.getEurRate();
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

    getEurRate() {
        return this.rates.eurToRub * this.coefficients.eurCoeff;
    }

    // Получить курс USD с коэффициентом
    getUsdRate() {
        return this.rates.usdToRub * this.coefficients.usdCoeff;
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
