// Gemensamma funktioner för både huvudsidan och jämförelsesidan

function calculateNewPrice(subject) {
    const trimLevel = identifyTrimLevel(subject);
    const engine = identifyEngine(subject);
    
    // Grundpriser för olika trim-nivåer
    const basePrices = {
        'momentum': 459900,
        'inscription': 489900,
        'r-design': 499900,
        'cross country': 519900,
        'polestar engineered': 789900
    };
    
    // Prispåslag för olika motorer
    const enginePrices = {
        'b3': 0,
        'b4': 20000,
        'b5': 40000,
        'b6': 60000,
        't6': 80000,
        't8': 100000,
        'd4': 30000,
        'b4 diesel': 30000
    };
    
    // Lägg till prispåslag för AWD
    const isAWD = subject.toLowerCase().includes('awd') || 
                  subject.toLowerCase().includes('fyrhjulsdrift');
    const awdPrice = isAWD ? 20000 : 0;
    
    const basePrice = basePrices[trimLevel] || basePrices['momentum'];
    const enginePrice = enginePrices[engine] || 0;
    
    return basePrice + enginePrice + awdPrice;
}

function identifyTrimLevel(subject) {
    const text = subject.toLowerCase();
    if (text.includes('polestar') || text.includes('polestar engineered')) {
        return 'polestar engineered';
    } else if (text.includes('r-design')) {
        return 'r-design';
    } else if (text.includes('inscription')) {
        return 'inscription';
    } else if (text.includes('cross country')) {
        return 'cross country';
    } else {
        return 'momentum';
    }
}

function identifyEngine(subject) {
    const text = subject.toLowerCase();
    const engines = ['t8', 't6', 'b6', 'b5', 'b4', 'b3', 'd4'];
    
    // Kontrollera AWD-varianter först
    for (const engine of engines) {
        if (text.includes(engine + ' awd')) {
            return engine + ' awd';
        }
    }
    
    // Sedan vanliga motorer
    for (const engine of engines) {
        if (text.includes(engine)) {
            return engine;
        }
    }
    
    // Särskild kontroll för B4 diesel
    if (text.includes('b4') && text.includes('diesel')) {
        return 'b4 diesel';
    }
    
    return 'b4'; // Default till B4 om ingen match
}

function calculateTax(subject) {
    const engine = identifyEngine(subject);
    
    // Skattebelopp baserat på motortyp
    const taxRates = {
        'b4': 3389,
        't6': 360,
        'd4': 1975,
        'b4 diesel': 3389,  // Samma som D4
        'b3': 3389,         // Samma som B4
        'b5': 3389,         // Samma som B4
        'b6': 3389,         // Samma som B4
        't8': 360,          // Samma som T6 (plugin-hybrid)
        'b4 awd': 3389,     // AWD variant av B4
        'b5 awd': 3389,     // AWD variant av B5
        'b6 awd': 3389      // AWD variant av B6
    };
    
    return taxRates[engine] || 3389; // Default till B4 om ingen match
}

function calculateInsurance(subject) {
    const engine = identifyEngine(subject);
    
    // Försäkringskostnad per månad baserat på motortyp
    const insuranceRates = {
        'b4': 477,
        't6': 843,
        'd4': 477,
        'b4 diesel': 477,
        'b3': 477,
        'b5': 527,
        'b6': 627,
        't8': 843,
        'b4 awd': 527,
        'b5 awd': 577,
        'b6 awd': 677
    };
    
    return insuranceRates[engine] || 477; // Default till B4 om ingen match
}

function extractFeatures(subject) {
    const features = [];
    const text = subject.toLowerCase();
    
    // Lista över kända features att leta efter
    const knownFeatures = [
        'drag', 'dragkrok', 'voc', 'panorama', 'soltak', 'harman kardon',
        'pilot assist', 'head-up', 'luftfjädring', 'air suspension',
        '360', 'backkamera', 'park assist', 'klimatpaket', 'teknikpaket',
        'vinterdäck', 'sommarhjul', 'vinterhjul', 'metallic', 'läder',
        'elstolar', 'minne', 'apple carplay', 'android auto', 'navigation',
        'adaptiv farthållare', 'keyless', 'nyckellös', 'elbaklucka'
    ];
    
    // Sök efter varje feature
    knownFeatures.forEach(feature => {
        if (text.includes(feature)) {
            features.push(feature.charAt(0).toUpperCase() + feature.slice(1));
        }
    });
    
    return features;
}

function calculateFairPrice(car, allCars) {
    const trimLevel = identifyTrimLevel(car.ad.subject);
    const engine = identifyEngine(car.ad.subject);
    const age = new Date().getFullYear() - car.ad.regDate;
    
    // Filtrera bort privatleasing och hitta liknande bilar
    const similarCars = allCars.filter(otherCar => 
        otherCar.ad.ad_id !== car.ad.ad_id &&
        !otherCar.ad.subject.toLowerCase().includes('privatleasing') &&
        identifyTrimLevel(otherCar.ad.subject) === trimLevel &&
        identifyEngine(otherCar.ad.subject) === engine &&
        Math.abs(new Date().getFullYear() - otherCar.ad.regDate - age) <= 2
    );
    
    if (similarCars.length === 0) {
        // Om inga exakta matchningar hittas, försök med bara trim-nivå och ålder, fortfarande exkludera privatleasing
        const lessStrictCars = allCars.filter(otherCar => 
            otherCar.ad.ad_id !== car.ad.ad_id &&
            !otherCar.ad.subject.toLowerCase().includes('privatleasing') &&
            identifyTrimLevel(otherCar.ad.subject) === trimLevel &&
            Math.abs(new Date().getFullYear() - otherCar.ad.regDate - age) <= 2
        );
        
        if (lessStrictCars.length === 0) {
            return null;
        }
        
        similarCars.push(...lessStrictCars);
    }

    // Beräkna genomsnittligt pris per mil för liknande bilar
    const pricesPerMile = similarCars.map(similarCar => ({
        pricePerMile: similarCar.ad.price.value / similarCar.ad.mileage,
        mileageDiff: Math.abs(similarCar.ad.mileage - car.ad.mileage),
        ageDiff: Math.abs(new Date().getFullYear() - similarCar.ad.regDate - age)
    }));

    // Vikta priserna baserat på hur lika bilarna är
    const weights = pricesPerMile.map(data => {
        let weight = 1.0;
        // Minska vikten baserat på miltalsskillnad (max 50% minskning)
        weight *= (1 - Math.min(data.mileageDiff / 100000, 0.5));
        // Minska vikten baserat på åldersskillnad (max 30% minskning)
        weight *= (1 - (data.ageDiff * 0.15));
        return weight;
    });

    // Beräkna viktat genomsnitt för pris per mil
    const weightedAvgPricePerMile = pricesPerMile.reduce((sum, data, index) => 
        sum + (data.pricePerMile * weights[index]), 0
    ) / weights.reduce((sum, weight) => sum + weight, 0);

    // Beräkna rättvist pris baserat på denna bils miltal
    const fairPrice = Math.round(weightedAvgPricePerMile * car.ad.mileage);

    // Justera för extrautrustning
    const extraFeatures = extractFeatures(car.ad.subject);
    const extraValue = extraFeatures.length * 5000; // Uppskattat värde per extrautrustning

    return Math.round(fairPrice + extraValue);
} 