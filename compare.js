// Finansieringsparametrar
let financingParams = {
    downPaymentPercentage: 20,
    interestRate: 7.5,
    loanTermMonths: 60,
};

// Funktion för att beräkna restvärde baserat på låneperiod
function calculateResidualValue(price, loanTermMonths) {
    if (loanTermMonths <= 36) {
        return price * 0.55; // 55% restvärde vid 36 månader eller mindre
    } else if (loanTermMonths >= 72) {
        return 0; // Inget restvärde vid 72 månader eller mer
    } else {
        // Linjär interpolation mellan 36 och 72 månader
        const ratio = (72 - loanTermMonths) / (72 - 36);
        return price * 0.55 * ratio;
    }
}

// Funktion för att beräkna finansiering
function calculateFinancing(price) {
    const downPayment = price * (financingParams.downPaymentPercentage / 100);
    const loanAmount = price - downPayment;
    const residualValue = calculateResidualValue(price, financingParams.loanTermMonths);
    const monthlyInterestRate = financingParams.interestRate / 100 / 12;
    
    // Beräkna månadskostnad med hänsyn till restvärde
    const monthlyPayment = (loanAmount - residualValue) * 
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, financingParams.loanTermMonths)) / 
        (Math.pow(1 + monthlyInterestRate, financingParams.loanTermMonths) - 1);
    
    return {
        downPayment: Math.round(downPayment),
        loanAmount: Math.round(loanAmount),
        residualValue: Math.round(residualValue),
        monthlyPayment: Math.round(monthlyPayment)
    };
}

// Funktion för att uppdatera finansieringsparametrar
function updateFinancingParams(downPayment, interestRate, loanTerm) {
    const price = document.getElementById('price')?.value || 0;
    const downPaymentAmount = document.getElementById('downPaymentAmount');
    const downPaymentPercent = document.getElementById('downPayment');
    
    if (downPaymentAmount && downPaymentPercent) {
        if (document.activeElement === downPaymentAmount) {
            // Om beloppet ändrades, uppdatera procenten
            const newPercent = (parseFloat(downPaymentAmount.value) / price * 100).toFixed(1);
            downPaymentPercent.value = newPercent;
            financingParams.downPaymentPercentage = parseFloat(newPercent);
        } else {
            // Om procenten ändrades, uppdatera beloppet
            const newAmount = Math.round(price * (parseFloat(downPaymentPercent.value) / 100));
            downPaymentAmount.value = newAmount;
            financingParams.downPaymentPercentage = parseFloat(downPaymentPercent.value);
        }
    } else {
        financingParams.downPaymentPercentage = parseFloat(downPayment);
    }
    
    financingParams.interestRate = parseFloat(interestRate);
    financingParams.loanTermMonths = parseInt(loanTerm);
}

// Funktion för att jämföra en bil mot befintliga annonser
function compareCar() {
    // Hämta värden från formuläret
    const carModel = document.getElementById('carModel').value;
    const year = parseInt(document.getElementById('year').value);
    const mileage = parseInt(document.getElementById('mileage').value);
    const price = parseInt(document.getElementById('price').value);
    
    // Uppdatera finansieringsparametrar
    const downPayment = parseFloat(document.getElementById('downPayment').value);
    const interestRate = parseFloat(document.getElementById('interestRate').value);
    const loanTerm = parseInt(document.getElementById('loanTerm').value);
    
    // Validera input
    if (!carModel || !year || isNaN(mileage) || isNaN(price)) {
        alert('Vänligen fyll i alla fält korrekt');
        return;
    }
    
    // Uppdatera finansieringsparametrar
    updateFinancingParams(downPayment, interestRate, loanTerm);
    
    // Skapa ett objekt som representerar bilen
    const car = {
        ad: {
            subject: carModel,
            regDate: year,
            mileage: mileage,
            price: {
                value: price,
                suffix: 'kr'
            },
            images: [{ url: '' }],
            seller: { type: 'Privat', name: 'Din bil' }
        }
    };
    
    // Hämta data och jämför
    fetch('/data/cars.json')
        .then(response => response.json())
        .then(data => {
            const cars = data.data;
            showComparison(car, cars);
        })
        .catch(error => {
            console.error('Fel vid hämtning av data:', error);
            alert('Ett fel uppstod vid jämförelsen. Försök igen senare.');
        });
}

// Funktion för att visa jämförelseresultat
function showComparison(car, allCars) {
    const resultsDiv = document.getElementById('results');
    const comparisonDiv = document.getElementById('priceComparison');
    const monthlyCostDiv = document.getElementById('monthlyCost');
    const similarCarsDiv = document.getElementById('similarCars');
    
    // Beräkna nypris och värdeminskning
    const newPrice = calculateNewPrice(car.ad.subject);
    const depreciation = ((newPrice - car.ad.price.value) / newPrice * 100).toFixed(1);
    
    // Hitta liknande bilar
    const similarCars = allCars.filter(otherCar => 
        identifyTrimLevel(otherCar.ad.subject) === identifyTrimLevel(car.ad.subject) &&
        identifyEngine(otherCar.ad.subject) === identifyEngine(car.ad.subject) &&
        Math.abs(otherCar.ad.regDate - car.ad.regDate) <= 2
    );
    
    // Beräkna genomsnittligt pris och standardavvikelse
    const prices = similarCars.map(c => c.ad.price.value);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const stdDev = prices.length > 0 ? Math.sqrt(
        prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length
    ) : 0;
    
    // Beräkna rättvist pris baserat på miltal
    const fairPrice = calculateFairPrice(car, allCars);
    const priceDiff = fairPrice ? car.ad.price.value - fairPrice : null;
    
    // Beräkna månadskostnader
    const yearlyTax = calculateTax(car.ad.subject);
    const monthlyInsurance = calculateInsurance(car.ad.subject);
    const financing = calculateFinancing(car.ad.price.value);
    const totalMonthlyCost = Math.round(monthlyInsurance + (yearlyTax / 12) + financing.monthlyPayment);
    
    // Skapa HTML för prisjämförelse
    comparisonDiv.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 class="font-semibold text-gray-700">Din bil</h3>
                    <p class="text-2xl font-bold text-gray-800">${car.ad.price.value.toLocaleString()} kr</p>
                    <p class="text-sm text-gray-600">Nypris: ${newPrice.toLocaleString()} kr</p>
                    <p class="text-sm ${depreciation > 30 ? 'text-green-600' : 'text-gray-600'}">
                        Värdeminskning: ${depreciation}%
                    </p>
                    <div class="mt-2">
                        <p class="text-sm text-gray-600">Specifikationer:</p>
                        <ul class="text-sm text-gray-600 mt-1">
                            <li>Trim: ${identifyTrimLevel(car.ad.subject)}</li>
                            <li>Motor: ${identifyEngine(car.ad.subject)}</li>
                            <li>Miltal: ${car.ad.mileage.toLocaleString()} km</li>
                            <li>Årsmodell: ${car.ad.regDate}</li>
                        </ul>
                    </div>
                </div>
                <div>
                    <h3 class="font-semibold text-gray-700">Marknadsjämförelse</h3>
                    <p class="text-gray-600">Baserat på ${similarCars.length} liknande bilar</p>
                    <p class="text-sm text-gray-600">Genomsnittspris: ${Math.round(avgPrice).toLocaleString()} kr</p>
                    <p class="text-sm text-gray-600">Prisspann: ${Math.round(avgPrice - stdDev).toLocaleString()} - ${Math.round(avgPrice + stdDev).toLocaleString()} kr</p>
                </div>
            </div>
            
            ${fairPrice ? `
                <div class="mt-4 p-4 ${Math.abs(priceDiff) < stdDev ? 'bg-green-50' : priceDiff > 0 ? 'bg-red-50' : 'bg-blue-50'} rounded-lg">
                    <h3 class="font-semibold ${Math.abs(priceDiff) < stdDev ? 'text-green-800' : priceDiff > 0 ? 'text-red-800' : 'text-blue-800'}">
                        Prisvärdering
                    </h3>
                    <div class="mt-2 space-y-2">
                        <p class="text-sm">Rättvist pris beräknat på:</p>
                        <ul class="text-sm list-disc list-inside pl-2">
                            <li>Genomsnittligt pris per mil för liknande bilar</li>
                            <li>Viktning baserad på miltal och ålder</li>
                            <li>Justering för extrautrustning (${extractFeatures(car.ad.subject).length} tillval)</li>
                        </ul>
                        <p class="font-medium mt-3">
                            Uppskattat rättvist pris: ${fairPrice.toLocaleString()} kr
                        </p>
                        <p class="text-sm mt-1">
                            Din bil är prissatt ${Math.abs(priceDiff).toLocaleString()} kr 
                            ${priceDiff > 0 ? 'över' : 'under'} uppskattat marknadsvärde
                        </p>
                        <p class="text-sm mt-2 font-medium">
                            ${Math.abs(priceDiff) < stdDev 
                                ? 'Priset ligger inom normalt marknadsspann' 
                                : priceDiff > 0 
                                    ? 'Priset är högre än marknadssnittet' 
                                    : 'Priset är lägre än marknadssnittet'}
                        </p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Visa månadskostnader
    monthlyCostDiv.innerHTML = `
        <h3 class="font-semibold text-gray-700 mb-3">Månadskostnader</h3>
        <div class="bg-gray-50 p-4 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 class="font-medium text-gray-700">Fasta kostnader</h4>
                    <div class="space-y-2 mt-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Fordonsskatt</span>
                            <span class="font-medium">${Math.round(yearlyTax / 12)} kr/mån</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Försäkring</span>
                            <span class="font-medium">${monthlyInsurance} kr/mån</span>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 class="font-medium text-gray-700">Finansiering</h4>
                    <div class="space-y-2 mt-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Kontantinsats (${financingParams.downPaymentPercentage}%)</span>
                            <span class="font-medium">${financing.downPayment.toLocaleString()} kr</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Månadskostnad lån</span>
                            <span class="font-medium">${financing.monthlyPayment} kr/mån</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Restvärde</span>
                            <span class="font-medium">${financing.residualValue.toLocaleString()} kr</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-gray-700">Total månadskostnad</span>
                    <span class="text-xl font-bold text-blue-600">${totalMonthlyCost} kr/mån</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">Inkluderar försäkring, skatt och finansiering</p>
            </div>
        </div>
    `;
    
    // Visa liknande bilar
    similarCarsDiv.innerHTML = `
        <h3 class="font-semibold text-gray-700 mb-4">Liknande bilar på marknaden</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${similarCars.slice(0, 4).map(similarCar => `
                <div class="border rounded-lg p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-medium text-gray-800">${similarCar.ad.price.value.toLocaleString()} kr</p>
                            <p class="text-sm text-gray-600">${similarCar.ad.mileage.toLocaleString()} km</p>
                            <p class="text-sm text-gray-600">${similarCar.ad.regDate}</p>
                        </div>
                        <a href="${similarCar.ad.share_url}" target="_blank" 
                           class="text-blue-600 hover:text-blue-800 text-sm">
                            Visa annons
                        </a>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Visa resultatsektionen
    resultsDiv.classList.remove('hidden');
}

// Exportera funktioner som behövs globalt
window.compareCar = compareCar;
window.updateFinancingParams = updateFinancingParams; 