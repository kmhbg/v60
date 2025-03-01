// Global variabel för att hålla koll på markerad bil och sortering
let selectedCarId = null;
let currentSort = 'score'; // Default sortering på poäng
let selectedTrimLevels = new Set(); // Valda utrustningsnivåer
let selectedEngines = new Set(); // Valda motoralternativ

// Globala finansieringsparametrar
let financingParams = {
    downPayment: 0.20,
    interestRate: 0.075,
    loanTerm: 60
};

// Globala variabler
let currentCars = [];
let currentPage = 1;
let carsPerPage = 9;

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

// Funktion för att beräkna månadskostnad
function calculateMonthlyPayment(price, downPayment, interestRate, loanTerm) {
    if (!price || !downPayment || !interestRate || !loanTerm) {
        console.error('Ogiltiga parametrar för månadskostnadsberäkning:', { price, downPayment, interestRate, loanTerm });
        return 0;
    }

    const loanAmount = price * (1 - downPayment);
    let residualValue = 0;
    
    // Beräkna restvärde baserat på låneperiod
    if (loanTerm === 36) {
        residualValue = price * 0.55;
    } else if (loanTerm === 48) {
        residualValue = price * 0.45;
    } else if (loanTerm === 60) {
        residualValue = price * 0.35;
    }
    
    const monthlyInterestRate = interestRate / 12;
    
    try {
        if (residualValue > 0) {
            return (loanAmount - (residualValue / Math.pow(1 + monthlyInterestRate, loanTerm))) *
                (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTerm)) /
                (Math.pow(1 + monthlyInterestRate, loanTerm) - 1);
        } else {
            return (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTerm)) /
                (Math.pow(1 + monthlyInterestRate, loanTerm) - 1);
        }
    } catch (error) {
        console.error('Fel vid beräkning av månadskostnad:', error);
        return 0;
    }
}

// Funktion för att beräkna finansieringskostnad
function calculateFinancing(price) {
    const downPayment = price * (financingParams.downPaymentPercentage / 100);
    const residualValue = calculateResidualValue(price, financingParams.loanTermMonths);
    const loanAmount = price - downPayment - residualValue;
    const monthlyRate = financingParams.interestRate / 100 / 12;
    
    // Månadskostnad enligt annuitetsformel
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, financingParams.loanTermMonths)) / 
                          (Math.pow(1 + monthlyRate, financingParams.loanTermMonths) - 1);
    
    return {
        monthlyPayment: Math.round(monthlyPayment),
        downPayment: Math.round(downPayment),
        loanAmount: Math.round(loanAmount),
        residualValue: Math.round(residualValue)
    };
}

// Funktion för att uppdatera finansieringsparametrar och rendera om bilar
function updateFinancingParams() {
    const downPaymentInput = document.getElementById('downPayment');
    const interestRateInput = document.getElementById('interestRate');
    const loanTermInput = document.getElementById('loanTerm');

    if (!downPaymentInput || !interestRateInput || !loanTermInput) {
        console.error('Kunde inte hitta finansieringsformulär');
        return;
    }

    try {
        const newDownPayment = parseFloat(downPaymentInput.value) / 100;
        const newInterestRate = parseFloat(interestRateInput.value) / 100;
        const newLoanTerm = parseInt(loanTermInput.value);

        if (!isNaN(newDownPayment) && !isNaN(newInterestRate) && !isNaN(newLoanTerm)) {
            financingParams = {
                downPayment: newDownPayment,
                interestRate: newInterestRate,
                loanTerm: newLoanTerm
            };
            
            if (currentCars.length > 0) {
                renderCars(currentCars);
            }
        }
    } catch (error) {
        console.error('Fel vid uppdatering av finansieringsparametrar:', error);
    }
}

// Nypris för olika modeller och utrustningsnivåer
const newCarPrices = {
    'momentum': {
        'b3': 489900,
        'b4': 499900,
        'b4 diesel': 519900,
        'd3': 509900,
        'd4': 529900,
        'b5': 539900,
        'b6': 589900
    },
    'inscription': {
        'b3': 529900,
        'b4': 539900,
        'b4 diesel': 559900,
        'd3': 549900,
        'd4': 569900,
        'b5': 579900,
        'b6': 629900
    },
    'r-design': {
        'b3': 529900,
        'b4': 539900,
        'b4 diesel': 559900,
        'd3': 549900,
        'd4': 569900,
        'b5': 579900,
        'b6': 629900
    },
    'cross country': {
        'b4 awd': 579900,
        'b5 awd': 619900,
        'b6 awd': 669900
    },
    'recharge': {
        't6': 669900,
        't8': 729900
    }
};

// Basutrustning för varje nivå
const baseEquipment = {
    'momentum': [
        // Säkerhet
        'city safety',
        'connected safety',
        'intellisafe standardfunktioner',
        'bältesförsträckare på samtliga platser',
        'isofix-fästen i baksätets ytterplatser',
        'nyckelavstängning av passagerarkrockkudde',
        'elektronisk startspärr',
        'larm från volvo guard med blockerat låsläge',
        'elektriskt barnsäkerhetslås i bakdörrar',
        'hill start assist',
        
        // Exteriör
        'led-strålkastare med automatisk avbländning',
        'strålkastarspolare',
        'drl-ljus med automatiskt halvljus',
        'tonade rutor',
        'integrerade takrails i svart',
        'fullt färganpassade trösklar, stötfångare och ytterbackspeglar',
        'fönsterlister i svart',
        
        // Interiör
        'digital förardisplay 12.3"',
        'dekorinlägg i iron ore aluminium',
        'ratt i läder med uni deco',
        'växelväljarknopp i läder med uni deco',
        'interiör belysning',
        'trygghetsbelysning',
        'belysta make up-speglar',
        'insynsskydd över lastutrymme',
        'lastnät',
        'rostfri tröskeldekor i lastutrymmet',
        
        // Komfort
        'klimatsystem med två zoner',
        'luftkvalitetssystem med multifilter',
        'eluppvärmda framstolar',
        'elmanövrerade svankstöd framstolar',
        'regnsensor',
        'fuktighetssensor',
        'bakre parkeringssensor',
        'elektriska fönsterhissar fram och bak',
        'elektriskt infällbara ytterbackspeglar',
        'eluppvärmda ytterbackspeglar',
        'innerbackspegel med automatisk avbländning',
        'elektriskt fällbara nackskydd bak',
        'baksäte med 60/40-delning',
        'armstöd med mugghållare bak',
        
        // Teknik
        'sensus connect high performance',
        'röststyrning',
        'volvo on call med wifi hotspot',
        'internet maps',
        'start/stopp-funktion',
        'keyless start',
        'fjärrstyrt centrallås',
        'färddator',
        'yttertemperaturmätare',
        
        // Praktiskt
        '12v eluttag fram och bak',
        'capless fuel filling',
        'däcklagningssats',
        'första förbandskudde',
        'varningstriangel',
        'hållare för parkeringsbiljett'
    ],
    
    'inscription': [
        // Extra utöver Momentum
        'dekorinlägg i driftwood',
        'dimljus led',
        'drive mode settings',
        'elmanövrerad baklucka',
        'elmanövrerad förarstol med minne',
        'elmanövrerad dynförlängning förarstol',
        'manuell dynförlängning passagerarstol',
        'keyless entry',
        'parkeringssensorer fram',
        'integrerade takrails i silver',
        'fönsterlister i blankt silver',
        'silverfärgad grill med vertikala ribbor',
        'högblank kromlist runt främre spoilers',
        'diffusor i charcoal med kromlist',
        'instegsbelysning i dörrhandtag',
        'interiör stämningsbelysning',
        'textilmattor inscription',
        'nätficka på tunnelkonsol',
        'intellisafe assist'
    ],
    
    'r-design': [
        // Extra utöver Momentum
        'dekorinlägg i metal mesh',
        'dimljus led',
        'drive mode settings',
        'elmanövrerad baklucka',
        'elmanövrerad förarstol med minne',
        'elmanövrerad dynförlängning förarstol',
        'manuell dynförlängning passagerarstol',
        'keyless entry',
        'parkeringssensorer fram',
        'integrerade takrails i högblankt svart',
        'fönsterlister högblankt svart',
        'högblank svart grill med rutmönster',
        'svarta backspegelkåpor',
        'diffuser i r-design',
        'sportchassi',
        'pedaler i r-design',
        'svart innertak',
        'instegsbelysning i dörrhandtag',
        'interiör stämningsbelysning',
        'textilmattor r-design',
        'nätficka på tunnelkonsol',
        'intellisafe assist'
    ],
    
    'cross country': [
        // Extra utöver Momentum
        'högre markfrigång',
        'fyrhjulsdrift',
        'hill descent control',
        'grill i cross country-utförande',
        'integrerade takrails i silver',
        'touring chassi',
        'cross country-specifik exteriör',
        '18" lättmetallfälgar'
    ],
    
    'polestar engineered': [
        // Specifik Polestar utrustning
        'öhlins stötdämpare med dual flow-ventil',
        'brembo bromsar',
        'polestar optimering',
        'polestar engineered chassi',
        'polestar engineered fjäderbensstag',
        'bromsok i gold',
        'säkerhetsbälten i gold',
        'luftventilhattar i gold',
        'polestar-emblem på grill och baklucka',
        'sportchassi',
        'växlingspaddlar',
        'klädd instrumentpanel',
        'harman kardon med subwoofer',
        // Ärver även R-Design utrustning
        'dekorinlägg i metal mesh',
        'dimljus led',
        'drive mode settings',
        'elmanövrerad baklucka',
        'elmanövrerad förarstol med minne',
        'svart innertak',
        'sportpedaler',
        'keyless entry'
    ]
};

// Funktion för att hämta all utrustning för en given nivå
function getTrimLevelEquipment(level) {
    let equipment = [];
    
    // Lägg till Momentum som bas för alla
    equipment = [...baseEquipment['momentum']];
    
    // Lägg till nivåspecifik utrustning
    if (level !== 'momentum') {
        equipment = [...equipment, ...baseEquipment[level]];
    }
    
    // Extra för Polestar (ärver R-Design)
    if (level === 'polestar engineered') {
        equipment = [...equipment, ...baseEquipment['r-design']];
    }
    
    return equipment;
}

// Funktion för att identifiera utrustningsnivå från bilens namn
function identifyTrimLevel(subject) {
    const name = subject.toLowerCase();
    
    // Polestar varianter (högst prioritet)
    if (name.includes('polestar') || name.includes('pe')) {
        return 'polestar engineered';
    }
    
    // Cross Country varianter
    if (name.includes('cross') || name.includes('cc')) {
        return 'cross country';
    }
    
    // R-Design varianter
    if (name.includes('r-design') || name.includes('rdesign')) {
        return 'r-design';
    }
    
    // Inscription varianter
    if (name.includes('inscription') || name.includes('insc')) {
        return 'inscription';
    }
    
    // Momentum varianter (default)
    if (name.includes('momentum') || name.includes('mom')) {
        return 'momentum';
    }
    
    return 'momentum'; // Default till Momentum
}

// Funktion för att identifiera motorvariant
function identifyEngine(subject) {
    const name = subject.toLowerCase();
    
    // Recharge/Plugin-hybrid
    if (name.includes('recharge') || name.includes('t8') || 
        (name.includes('t6') && name.includes('twin'))) {
        return name.includes('t8') ? 't8' : 't6';
    }
    
    // Bensin/Diesel varianter
    if (name.includes('b3')) return 'b3';
    if (name.includes('b4')) {
        return name.includes('diesel') ? 'b4 diesel' : 'b4';
    }
    if (name.includes('b5')) return 'b5';
    if (name.includes('b6')) return 'b6';
    if (name.includes('d3')) return 'd3';
    if (name.includes('d4')) return 'd4';
    
    // Cross Country specifika
    if (name.includes('cross country') || name.includes('cc')) {
        if (name.includes('b4')) return 'b4 awd';
        if (name.includes('b5')) return 'b5 awd';
        if (name.includes('b6')) return 'b6 awd';
    }
    
    return 'b4'; // Default till vanligaste motorn
}

// Funktion för att beräkna nypris
function calculateNewPrice(subject) {
    const trimLevel = identifyTrimLevel(subject);
    const engine = identifyEngine(subject);
    
    // Hantera Recharge modeller separat
    if (engine === 't6' || engine === 't8') {
        return newCarPrices.recharge[engine];
    }
    
    // Hämta pris baserat på trim och motor
    return newCarPrices[trimLevel]?.[engine] || newCarPrices.momentum.b4;
}

// Funktion för att extrahera features från bilens titel och beskrivning
function extractFeatures(subject) {
    const features = new Set();
    
    // Identifiera utrustningsnivå
    const trimLevel = identifyTrimLevel(subject);
    const standardFeatures = getTrimLevelEquipment(trimLevel);
    
    // Extra utrustning som ofta nämns i rubriken
    const keywords = [
        'VOC', 'Värmare', 'Backkamera', 'Navigation', 'Navi', 
        'Drag', 'Dragkrok', 'Skinn', 'Sensorer', 'BLIS', 
        'AWD', 'Recharge'
    ];
    
    keywords.forEach(keyword => {
        if (subject.toLowerCase().includes(keyword.toLowerCase())) {
            features.add(keyword);
        }
    });
    
    // Normalisera vissa features
    if (features.has('Navi')) {
        features.delete('Navi');
        features.add('Navigation');
    }
    if (features.has('VOC')) {
        features.delete('VOC');
        features.add('Volvo On Call');
    }
    if (features.has('AWD')) {
        features.delete('AWD');
        features.add('fyrhjulsdrift');
    }
    if (features.has('Recharge')) {
        features.delete('Recharge');
        features.add('plug-in hybrid');
    }
    
    // Filtrera bort standardutrustning
    const extraFeatures = Array.from(features).filter(feature => 
        !standardFeatures.includes(feature.toLowerCase())
    );
    
    return extraFeatures;
}

// Funktion för att beräkna rättvist pris baserat på liknande bilar
function calculateFairPrice(car, allCars) {
    const trimLevel = identifyTrimLevel(car.ad.subject);
    const engine = identifyEngine(car.ad.subject);
    const age = new Date().getFullYear() - car.ad.regDate;
    
    // Hitta liknande bilar (samma trim och motor, +/- 2 år i ålder)
    const similarCars = allCars.filter(otherCar => 
        otherCar.ad.ad_id !== car.ad.ad_id &&
        identifyTrimLevel(otherCar.ad.subject) === trimLevel &&
        identifyEngine(otherCar.ad.subject) === engine &&
        Math.abs(new Date().getFullYear() - otherCar.ad.regDate - age) <= 2
    );
    
    if (similarCars.length === 0) {
        // Om inga exakta matchningar hittas, försök med bara trim-nivå och ålder
        const lessStrictCars = allCars.filter(otherCar => 
            otherCar.ad.ad_id !== car.ad.ad_id &&
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

// Funktion för att beräkna poäng för varje bil
function calculateScore(car) {
    // Beräkna nypris och värdeminskning
    const newPrice = calculateNewPrice(car.ad.subject);
    const currentPrice = car.ad.price.value;
    const valueRetention = currentPrice / newPrice;
    
    // För köpare är högre värdeminskning bättre (inverterar värdet)
    const normalizedValueRetention = 1 - Math.min(valueRetention, 1);
    
    // Pris per mil (lägre är bättre)
    const pricePerMile = currentPrice / car.ad.mileage;
    const normalizedPricePerMile = 1 - (pricePerMile / 1000);
    
    // Ålder (nyare är bättre)
    const age = new Date().getFullYear() - car.ad.regDate;
    const normalizedAge = 1 - (age / 5);
    
    // Miltal per år (lägre är bättre)
    const milesPerYear = car.ad.mileage / (age || 1);
    const normalizedMilesPerYear = 1 - (milesPerYear / 20000);
    
    // Trimlevels poäng
    const trimLevel = identifyTrimLevel(car.ad.subject);
    const trimScore = {
        'momentum': 0.5,
        'inscription': 0.7,
        'r-design': 0.8,
        'cross country': 0.75,
        'polestar engineered': 1.0
    }[trimLevel] || 0.5;
    
    // Drivlina poäng
    let powertrainScore = 0.5;
    const subject = car.ad.subject.toLowerCase();
    if (subject.includes('recharge') || subject.includes('twin engine') || 
        subject.includes('t8') || subject.includes('t6')) {
        powertrainScore += 0.3;
    }
    if (subject.includes('awd') || subject.includes('fyrhjulsdrift')) {
        powertrainScore += 0.2;
    }
    
    // Extrautrustning poäng
    const extraFeatures = extractFeatures(car.ad.subject);
    const extraScore = Math.min(extraFeatures.length / 10, 1);
    
    // Viktning av olika faktorer
    return (
        normalizedValueRetention * 0.25 +    // 25% vikt på värdeminskning (högre är bättre för köpare)
        normalizedPricePerMile * 0.15 +      // 15% vikt på pris per mil
        normalizedAge * 0.15 +               // 15% vikt på ålder
        normalizedMilesPerYear * 0.15 +      // 15% vikt på miltal per år
        trimScore * 0.15 +                   // 15% vikt på utrustningsnivå
        powertrainScore * 0.10 +             // 10% vikt på drivlina
        extraScore * 0.05                    // 5% vikt på extrautrustning
    );
}

// Funktion för att beräkna pris per mil-relation
function calculateValueScore(car) {
    // Lägre värde = bättre relation mellan pris och miltal
    return car.ad.price.value / (car.ad.mileage + 1);
}

// Funktion för att normalisera features
function normalizeFeature(feature) {
    const f = feature.toLowerCase().trim();
    
    const featureMap = {
        // Utrustningsnivåer
        'momentum': 'momentum',
        'momentum pro': 'momentum',
        'momentum advanced': 'momentum',
        'momentum advanced edition': 'momentum',
        'momentum se': 'momentum',
        
        'inscription': 'inscription',
        'inscription pro': 'inscription',
        'inscription expression': 'inscription',
        
        'r-design': 'r-design',
        'r-design pro': 'r-design',
        'r-design expression': 'r-design',
        
        'cross country': 'cross country',
        'cross country pro': 'cross country',
        
        'polestar': 'polestar engineered',
        'polestar engineered': 'polestar engineered',
        'polestar optimerad': 'polestar engineered',
        
        // Motorvarianter
        't6 twin engine': 'plug-in hybrid',
        't8 twin engine': 'plug-in hybrid',
        'twin engine': 'plug-in hybrid',
        'recharge': 'plug-in hybrid',
        'phev': 'plug-in hybrid',
        
        // Chassi och prestanda
        'dynamiskt chassi': 'dynamiskt chassi',
        'touring chassi': 'touring chassi',
        'sportchassi': 'sport chassi',
        'öhlins chassi': 'polestar chassi',
        'polestar engineered chassi': 'polestar chassi',
        'drive mode settings': 'körlägesväljare',
        'körprofiler': 'körlägesväljare',
        
        // Fälgar och bromsar
        '17" alu-fälg': 'lättmetallfälgar',
        '17"5-d spoke silver': 'lättmetallfälgar',
        '18" 5-spoke': 'lättmetallfälgar',
        '18" 10-multi spoke': 'lättmetallfälgar',
        '19" 5-double spoke': 'lättmetallfälgar',
        '19" 5-y spoke': 'lättmetallfälgar',
        'brembo': 'brembo bromsar',
        'polestar engineered bromsar': 'brembo bromsar',
        
        // Interiör detaljer
        'driftwood': 'driftwood dekor',
        'metal mesh': 'metal mesh dekor',
        'iron ore': 'iron ore dekor',
        'orrefors kristall': 'orrefors växelväljare',
        'växelväljare kristall': 'orrefors växelväljare',
        
        // Säkerhetssystem
        'intellisafe assist': 'intellisafe assist',
        'intellisafe surround': 'intellisafe surround',
        'intellisafe standardfunktioner': 'intellisafe standard',
        'city safety': 'city safety',
        'connected safety': 'connected safety',
        
        // Komfort
        'klimatsystem två zoner': 'klimatautomatik',
        'klimatsystem med två zoner': 'klimatautomatik',
        '2-zons klimat': 'klimatautomatik',
        
        // Ljus och sikt
        'led-strålkastare': 'led-strålkastare',
        'strålkastare led': 'led-strålkastare',
        'led strålkastare': 'led-strålkastare',
        'strålkastare med led': 'led-strålkastare',
        'dimljus led': 'led-dimljus',
        'dimljus med led': 'led-dimljus',
        
        // Praktiska detaljer
        'lastnät': 'lastnät',
        'insynsskydd lastutrymme': 'insynsskydd',
        'insynsskydd över lastutrymme': 'insynsskydd',
        'bagagenät': 'lastnät',
        
        // Elektriska funktioner
        'elmanövrerad baklucka': 'elbaklucka',
        'elmanövrerad baklucka med komfortmanövrering': 'elbaklucka',
        'elektrisk baklucka': 'elbaklucka',
        
        // Säten och klädsel
        'elmanövrerad förarstol med minne': 'minnesfunktion förarsäte',
        'förarstol med minne': 'minnesfunktion förarsäte',
        'dynförlängning': 'dynförlängning',
        'elmanövrerad dynförlängning': 'dynförlängning',
        
        // Connectivity
        'sensus connect': 'sensus connect',
        'sensus navigation': 'navigation',
        'harman kardon': 'harman kardon',
        'premium sound': 'harman kardon',
        
        // Navigation och infotainment
        'navigationssystem': 'navigation',
        'navigation pro': 'navigation',
        'navigation/gps': 'navigation',
        'gps navigation': 'navigation',
        'gps': 'navigation',
        'navi': 'navigation',
        'sensus navigation': 'navigation',
        'volvo navigation': 'navigation',
        'sensuscon. harman kardon': 'harman kardon',
        'harmankardon premiumsound': 'harman kardon',
        'high performance högtalarsystem': 'premium audio',
        'digitalradio dab+': 'digital radio',
        'radio med usb': 'radio',
        'bluetooth (handsfree)': 'bluetooth',
        'bluetooth streaming': 'bluetooth',
        'smartphone integration': 'smartphone integration',
        'apple carplay/android auto': 'smartphone integration',
        'apple carplay': 'smartphone integration',
        'android auto': 'smartphone integration',
        
        // Säkerhetssystem
        'isofix-fästen bak': 'isofix',
        'isofix-fästen': 'isofix',
        'isofix bak': 'isofix',
        'isofix fram': 'isofix',
        'isofixfästen ytterpl bak': 'isofix',
        'barnstolsfästen': 'isofix',
        'barnstolsfästen golv fram': 'isofix',
        'lane assist': 'körfilsassistent',
        'lane keeping aid': 'körfilsassistent',
        'körfilsassistent': 'körfilsassistent',
        'filhållningsassistans': 'körfilsassistent',
        'lane keeping alert': 'körfilsassistent',
        'autobroms': 'autobroms',
        'broms-assistans': 'autobroms',
        'abs bromsar': 'abs',
        'abs-bromsar': 'abs',
        
        // Klimat och komfort
        'klimatanläggning': 'klimatautomatik',
        '2-zons klimatautomatik': 'klimatautomatik',
        'automatisk klimatanläggning': 'klimatautomatik',
        'acc': 'klimatautomatik',
        'automatisk ac': 'klimatautomatik',
        'acc 2 klimatzoner': 'klimatautomatik',
        'klimatanläggning 2-zons': 'klimatautomatik',
        '2 zons klimatanläggning': 'klimatautomatik',
        'ecc': 'klimatautomatik',
        'a/c': 'klimatautomatik',
        
        // Parkeringshjälp
        'parkeringssensorer fram': 'parkeringssensorer',
        'parkeringssensorer bak': 'parkeringssensorer',
        'parkeringsassistans': 'parkeringssensorer',
        'park assist': 'parkeringssensorer',
        'parkeringshjälp': 'parkeringssensorer',
        'p-sensorer': 'parkeringssensorer',
        'park sensors': 'parkeringssensorer',
        'parkeringssensorer fram och bak': 'parkeringssensorer',
        'parkeringssensorer (fram/bak)': 'parkeringssensorer',
        'parkeringssensor fram/bak': 'parkeringssensorer',
        'parkeringssupport': 'parkeringssensorer',
        'parkeringssensorer (fram)': 'parkeringssensorer',
        'parkeringssensorer fram & bak': 'parkeringssensorer',
        
        // Kamera och sikt
        'backkamera': 'parkeringskamera',
        'ryggkamera': 'parkeringskamera',
        'kamera bak': 'parkeringskamera',
        'rear camera': 'parkeringskamera',
        'park camera': 'parkeringskamera',
        'parkeringskamera bak': 'parkeringskamera',
        
        // Dragkrok
        'dragkrok': 'dragkrok',
        'drag': 'dragkrok',
        'elektrisk dragkrok': 'dragkrok',
        'avtagbar dragkrok': 'dragkrok',
        'dragkrok (avtagbar)': 'dragkrok',
        'släpvagnskrok': 'dragkrok',
        'infällbar-dragkrok': 'dragkrok',
        'dragkrok (elutfällbar)': 'dragkrok',
        'dragkrok halvautomatisk': 'dragkrok',
        
        // Säten och komfort
        'elmanövrerat förarsäte': 'elsäten',
        'elmanövrerade säten': 'elsäten',
        'elektriska säten': 'elsäten',
        'el-säten': 'elsäten',
        'förarstol el': 'elsäten',
        'el-stolar': 'elsäten',
        'power seats': 'elsäten',
        'elstol': 'elsäten',
        'elmanövrerat passagerarsäte': 'elsäten',
        
        // Värmare
        'parkeringsvärmare': 'värmare',
        'motorvärmare': 'värmare',
        'kupévärmare': 'värmare',
        'dieselvärmare': 'värmare',
        'bränsledriven värmare': 'värmare',
        'webasto': 'värmare',
        'fjärrstyrd värmare': 'värmare',
        'standvärmare': 'värmare',
        'p-värm fjärrstyrd': 'värmare',
        'p-värm tidur': 'värmare',
        'dieselvärmare via mobilapp': 'värmare',
        'bränslevärmare': 'värmare',
        'motorvärmare (med tidur)': 'värmare',
        'parkeringsvärmare (med tidur)': 'värmare',
        'dieselvärmare med fjärr': 'värmare',
        'dieselvärmare med tidur': 'värmare',
        'programmerbar bränslevärm': 'värmare',
        
        // Klädsel
        'skinnklädsel': 'läderklädsel',
        'läderklädsel': 'läderklädsel',
        'skinninteriör': 'läderklädsel',
        'läderinteriör': 'läderklädsel',
        'delläder': 'halvläder',
        'halvläder': 'halvläder',
        'leather': 'läderklädsel',
        'leather seats': 'läderklädsel',
        'klädsel (helskinn)': 'läderklädsel',
        'läderpaket': 'läderklädsel',
        'svart tygklädsel': 'tygklädsel',
        
        // Keyless/Nyckellöst
        'keyless': 'keyless',
        'nyckellöst': 'keyless',
        'nyckelfri': 'keyless',
        'keyless drive': 'keyless',
        'keyless entry': 'keyless',
        'keyless entry and start': 'keyless',
        'keyless start': 'keyless',
        'nyckellös start': 'keyless',
        'keyless system': 'keyless',
        
        // BLIS/Döda vinkeln
        'blis': 'döda vinkeln-varning',
        'blind spot': 'döda vinkeln-varning',
        'blind spot information': 'döda vinkeln-varning',
        'döda vinkeln varning': 'döda vinkeln-varning',
        'döda vinkeln-varnare': 'döda vinkeln-varning',
        'blis - döda vinkel varning': 'döda vinkeln-varning',
        'blis (döda vinkel-varning)': 'döda vinkeln-varning',
        'blis döda vinkel varnare': 'döda vinkeln-varning',
        'intellisafe surround blis': 'döda vinkeln-varning',
        
        // Baklucka
        'bagagelucka (eldriven)': 'elbaklucka',
        'baklucka elmanövrerad': 'elbaklucka',
        'elstyrd baklucka': 'elbaklucka',
        'elektrisk bagagelucka': 'elbaklucka',
        'bagagelucka (automatisk)': 'elbaklucka',
        'elbagagelucka': 'elbaklucka',
        
        // Övrigt
        'miljöklass euro6d': 'euro6d',
        'miljöklass euro6d-temp': 'euro6d-temp',
        'svensksåld': 'svensksåld',
        'momsbil': 'momsbil',
        'avdragbar moms': 'momsbil',
        'leasebar': 'leasebar',
        'mildhybrid': 'mildhybrid',
        'awd': 'fyrhjulsdrift',
        'rails': 'rails',
        'tonade rutor': 'tonade rutor',
        'mörkt tonade rutor 5 st': 'tonade rutor',
        'virtual cockpit': 'digital förardisplay',
        'digitalt mätarhus': 'digital förardisplay',
        'digital förardisplay12.3"': 'digital förardisplay',
        'digital förardisplay12.3\"': 'digital förardisplay',
        
        // Säkerhetssystem och förarstöd
        'backstartshjälp': 'hill start assist',
        'hill start assist': 'hill start assist',
        'auto hold': 'auto hold',
        'elman. parkeringsbroms': 'auto hold',
        'startspärr': 'startspärr',
        'nödsamtal': 'nödsamtal',
        'assistans vid kollisionsrisk': 'autobroms',
        'pilot assist': 'pilot assist',
        'driver alert': 'driver alert control',
        'driver alert control': 'driver alert control',
        'dstc': 'antisladd',
        'antisladd': 'antisladd',
        'däcktryckskontroll itpms': 'däcktryckskontroll',
        
        // Airbags och krocksäkerhet
        'airbag': 'krockkuddar',
        'airbags': 'krockkuddar',
        'airbag förare': 'krockkuddar',
        'airbag passagerare fram': 'krockkuddar',
        'airbag förare & pass': 'krockkuddar',
        'airbag bak': 'krockkuddar',
        'krockkudde förar+passager': 'krockkuddar',
        'avstängningsbar airbag': 'avstängningsbar krockkudde passagerare',
        'avstängningsbar airbag passagerare': 'avstängningsbar krockkudde passagerare',
        'nyckelavst. kr-kudde pass': 'avstängningsbar krockkudde passagerare',
        'krockgardin ic i takpanel': 'krockgardin',
        
        // Speglar och sikt
        'avbländande sidospeglar': 'eluppvärmda sidospeglar',
        'ytterbacksp eluppvärmda': 'eluppvärmda sidospeglar',
        'elinfällbara sidospeglar': 'elinfällbara sidospeglar',
        'in/ut speglar aut avbländ': 'automatiskt avbländande speglar',
        'avbländande innerbackspegel': 'automatiskt avbländande speglar',
        
        // Värme och komfort
        'uppvärmda vindrutetorkare': 'uppvärmda vindrutetorkare',
        'rattvärme': 'uppvärmd ratt',
        'uppvärmd ratt': 'uppvärmd ratt',
        'stolvärme': 'sätesvärme fram',
        'sätesvärme fram': 'sätesvärme fram',
        'sätesvärme (fram)': 'sätesvärme fram',
        'framstolar eluppvärmda': 'sätesvärme fram',
        'uppvärmt förarsäte': 'sätesvärme fram',
        'uppvärmt passagerarsäte': 'sätesvärme fram',
        'baksätesvärme': 'sätesvärme bak',
        'sätesvärme (bak)': 'sätesvärme bak',
        'uppvärmt baksäte': 'sätesvärme bak',
        
        // Säten och inredning
        'fällbara baksäten': 'delbart baksäte',
        'delbart baksäte': 'delbart baksäte',
        'baksäte 60/40 delning': 'delbart baksäte',
        'nackskydd bak elfällbara': 'nackskydd bak elfällbara',
        'sminkspegel': 'sminkspegel',
        'läslampa': 'läslampa',
        'stämningsljus interiört': 'interiörbelysning',
        'interiörbelysning mid': 'interiörbelysning',
        'trygghetsbelysning': 'trygghetsbelysning',
        
        // Sensorer och automatik
        'ljussensor': 'ljussensor',
        'drlljus fr.m.autohalvljus': 'automatiskt halvljus',
        'strålkastarspolare': 'strålkastarspolare',
        'dimljus fram': 'dimljus led',
        'dimljus (led)': 'dimljus led',
        'aktiva kurvsljus': 'aktiva kurvsljus',
        
        // Paket och utrustningsnivåer
        'teknikpaket': 'teknikpaket',
        'teknikpaket pro': 'teknikpaket pro',
        'klimatpaket': 'klimatpaket',
        'ljuspaket': 'ljuspaket',
        'förarstödspaket': 'förarstödspaket',
        'vinterpaket': 'vinterpaket',
        
        // Multimedia och anslutningar
        'usb-uttag': 'usb-uttag',
        'usb-a 2 uttag t-kons': 'usb-uttag',
        'aux ingång': 'aux-ingång',
        '12v-uttag': '12v-uttag',
        'rattknappar för ljudanl.': 'rattknappar audio',
        'sensus connect hp 9"': 'sensus connect',
        'touchskärm': 'touchskärm',
        'subwoofer': 'subwoofer',
        
        // Körlägen och prestanda
        'drive mode settings': 'körlägesväljare',
        'drive mode körprofil': 'körlägesväljare',
        'körlägesväljare': 'körlägesväljare',
        'start-/stopp-system': 'start/stopp',
        'start o stopp': 'start/stopp',
        'start-/stoppfunktion': 'start/stopp',
        
        // Fälgar och däck
        '19" 5-open spoke black dc': 'lättmetallfälgar',
        '18"5-d sp mattgraphite dc': 'lättmetallfälgar',
        '17"alu-fälg': 'lättmetallfälgar',
        '17"5-d spoke silver': 'lättmetallfälgar',
        'däcklagningsats med kompr': 'däcklagningskit',
        'vinterhjul alu ingår': 'vinterhjul',
        'sommarhjul (tillval)': 'sommarhjul',
        
        // Övrigt praktiskt
        'lastnät': 'lastnät',
        'insynsskydd lastutrymme': 'insynsskydd',
        'dekorlist sidofönst/krom': 'kromdetaljer',
        'textilmattor': 'textilmattor',
        'första förbandskudde': 'första hjälpen',
        'luftkvalitetssystem aqs': 'luftkvalitetssystem',
        'fjärrstyrd start': 'fjärrstyrd start',
        'induktiv laddn': 'induktiv laddning',
        'centrallås (fjärrstyrt)': 'fjärrstyrt centrallås',
        '2 nycklar': '2 nycklar',
        
        // Trafikinformation och skyltläsning
        'traffic sign recognition': 'trafikskyltsinformation',
        'road sign information': 'trafikskyltsinformation',
        'trafikskyltsinformation': 'trafikskyltsinformation',
        'skyltavläsning': 'trafikskyltsinformation',
        
        // Cross Traffic Alert
        'cross traffic alert': 'cross traffic alert',
        
        // Adaptiv farthållare
        'adaptiv farthållare': 'adaptiv farthållare',
        'adaptiv farthållare': 'adaptiv farthållare',
        'fartbegränsare': 'fartbegränsare',
        
        // Barnlås
        'elinställbar barnlås': 'elektroniskt barnlås',
        'barnlås': 'elektroniskt barnlås',
        
        // Larm
        'larm - volvo guard': 'volvo guard larm',
        'larm -\nvolvo guard': 'volvo guard larm',
        
        // Parkeringsklimatisering
        'parkeringsklimatisering': 'parkeringsklimatisering',
        
        // Paket
        'teknikpaket': 'teknikpaket',
        'teknikpaket pro': 'teknikpaket pro',
        'klimatpaket': 'klimatpaket',
        'ljuspaket': 'ljuspaket',
        'förarstödspaket': 'förarstödspaket',
        'vinterpaket': 'vinterpaket',
        
        // Polestar specifikt
        'polestar effektoptimering': 'polestar optimering',
        'polestar optimering': 'polestar optimering',
        'öhlins stötdämpare': 'öhlins dämpare',
        'dual flow-ventil': 'öhlins dämpare',
        'gold bromsok': 'polestar bromsar',
        'brembo gold': 'polestar bromsar',
        
        // Volvo On Call och uppkoppling
        'voc': 'volvo on call',
        'volvo on call': 'volvo on call',
        'voc (volvo on call)': 'volvo on call',
        'connected services': 'volvo on call',
        'wifi hotspot': 'wifi hotspot',
        
        // Standardutrustning från olika nivåer
        'capless fuel filling': 'tanklocksfri tankning',
        'hill start assist': 'backstartshjälp',
        'keyless start': 'nyckelfri start',
        'keyless entry': 'nyckelfri',
        'keyless entry & start': 'nyckelfri',
        'keyless drive': 'nyckelfri',
        
        // Interiörbelysning
        'interiör belysning': 'interiörbelysning',
        'stämningsbelysning': 'interiörbelysning',
        'ambient lighting': 'interiörbelysning',
        'instegsbelysning': 'instegsbelysning',
        
        // Exteriör detaljer
        'rails': 'takrails',
        'takrails': 'takrails',
        'integrerade rails': 'takrails',
        'takrails silver': 'takrails',
        'takrails svart': 'takrails',
        
        // Säkerhet och förarstöd
        'trafikskyltsinformation': 'trafikskyltsinformation',
        'road sign information': 'trafikskyltsinformation',
        'traffic sign recognition': 'trafikskyltsinformation',
        'driver alert control': 'driver alert',
        'driver attention': 'driver alert',
        
        // Komfort och klimat
        'air quality system': 'luftkvalitetssystem',
        'interior air quality': 'luftkvalitetssystem',
        'multifilter': 'luftkvalitetssystem',
        'clean zone': 'luftkvalitetssystem',
        
        // Ljud och multimedia
        'premium audio': 'premium ljud',
        'high performance audio': 'premium ljud',
        'high performance sound': 'premium ljud',
        'premium sound system': 'premium ljud',
        
        // Laddning (för plug-in hybrider)
        'laddkabel': 'laddkabel typ 2',
        'typ2 kabel': 'laddkabel typ 2',
        'mode 3 kabel': 'laddkabel typ 2',
    };
    
    return featureMap[f] || feature;
}

// Funktion för att normalisera en lista av features
function normalizeFeatures(features) {
    // Normalisera varje feature och ta bort dubletter
    const normalizedSet = new Set(features.map(normalizeFeature));
    return Array.from(normalizedSet);
}

// Funktion för att hitta unika och saknade features
function compareFeatures(selectedFeatures, allCars) {
    // Identifiera utrustningsnivå för den valda bilen
    const selectedCar = allCars.find(car => car.ad.ad_id === selectedCarId);
    const selectedTrimLevel = identifyTrimLevel(selectedCar.ad.subject);
    const selectedStandardFeatures = getTrimLevelEquipment(selectedTrimLevel);
    
    // Normalisera features för den valda bilen
    const normalizedSelectedFeatures = normalizeFeatures(selectedFeatures);
    
    // Samla alla extrautrustning från andra bilar
    const otherFeatures = new Set();
    allCars.forEach(car => {
        if (car.ad.ad_id !== selectedCarId) {
            const carTrimLevel = identifyTrimLevel(car.ad.subject);
            const carStandardFeatures = getTrimLevelEquipment(carTrimLevel);
            const carFeatures = extractFeatures(car.ad.subject);
            
            // Lägg bara till features som inte är standard för den bilen
            carFeatures.forEach(feature => {
                if (!carStandardFeatures.includes(feature.toLowerCase())) {
                    otherFeatures.add(feature);
                }
            });
        }
    });

    // Hitta unika extrautrustning (finns i vald bil men inte i andra)
    const uniqueFeatures = normalizedSelectedFeatures.filter(feature => 
        !otherFeatures.has(feature) && !selectedStandardFeatures.includes(feature.toLowerCase())
    );
    
    // Hitta saknad extrautrustning (finns i andra bilar men inte i vald bil)
    const missingFeatures = Array.from(otherFeatures).filter(feature => 
        !normalizedSelectedFeatures.includes(feature) && !selectedStandardFeatures.includes(feature.toLowerCase())
    );
    
    return { uniqueFeatures, missingFeatures };
}

// Funktion för att beräkna årlig fordonsskatt
function calculateTax(subject, regDate) {
    const engine = identifyEngine(subject.toLowerCase());
    const regYear = parseInt(regDate);
    
    // Bonus Malus system för bilar registrerade från 1 juli 2018
    const isNewTaxSystem = regYear >= 2018;
    
    // Grundskatt för olika motortyper
    const baseTax = {
        // Laddhybrider
        't6': isNewTaxSystem ? 360 : 360,  // Recharge T6
        't8': isNewTaxSystem ? 360 : 360,  // Recharge T8
        
        // Bensin & Diesel
        'b3': isNewTaxSystem ? 2355 : 1635,
        'b4': isNewTaxSystem ? 2355 : 1635,
        'b5': isNewTaxSystem ? 2355 : 1635,
        'b6': isNewTaxSystem ? 2355 : 1635,
        
        // Diesel
        'd3': isNewTaxSystem ? 2355 : 1635,
        'd4': isNewTaxSystem ? 2355 : 1635,
        'b4 diesel': isNewTaxSystem ? 2355 : 1635,
        
        // AWD varianter
        'b4 awd': isNewTaxSystem ? 2355 : 1635,
        'b5 awd': isNewTaxSystem ? 2355 : 1635,
        'b6 awd': isNewTaxSystem ? 2355 : 1635
    };
    
    // Hämta grundskatt för motortypen, eller använd standardvärde
    let tax = baseTax[engine] || 2355;
    
    // För dieselbilar, lägg till dieseltillägg
    if (engine.includes('diesel') || engine === 'd3' || engine === 'd4') {
        tax = tax * 2.37; // Dieseltillägg
    }
    
    return Math.round(tax);
}

// Funktion för att beräkna uppskattad försäkringskostnad
function calculateInsurance(subject) {
    const engine = identifyEngine(subject);
    
    // Försäkringskostnad per månad baserat på motortyp
    const insuranceRates = {
        'b4': 477,
        't6': 843,
        'd4': 548
    };
    
    return insuranceRates[engine] || 477; // Default till B4 om ingen match
}

// Funktion för att skapa HTML för en bil
function createCarCard(car, score, rank, allCars) {
    const monthlyPayment = calculateMonthlyPayment(
        car.ad.price.value,
        financingParams.downPayment,
        financingParams.interestRate,
        financingParams.loanTerm
    );
    const monthlyTax = calculateTax(car.ad.subject, car.ad.regDate) / 12;
    const monthlyInsurance = calculateInsurance(car.ad.subject);
    const totalMonthlyCost = monthlyPayment + monthlyTax + monthlyInsurance;

    const fairPrice = calculateFairPrice(car, allCars);
    const features = extractFeatures(car.ad.subject);
    const trimLevel = identifyTrimLevel(car.ad.subject);
    const engine = identifyEngine(car.ad.subject);

    let imageUrl = '';
    if (car.ad.images && car.ad.images.length > 0) {
        const image = car.ad.images[0];
        if (typeof image === 'string') {
            imageUrl = `/images/${image}`;
        } else if (image.url) {
            imageUrl = image.url;
        } else if (image.filename) {
            imageUrl = `/images/${image.filename}`;
        }
    }
    
    const fallbackImageUrl = 'https://via.placeholder.com/400x300?text=Ingen+bild';

    return `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <!-- Bildbehållare -->
            <div class="relative h-56 overflow-hidden">
                <img src="${imageUrl || fallbackImageUrl}" 
                     alt="${car.ad.subject}"
                     class="w-full h-full object-cover"
                     onerror="this.src='${fallbackImageUrl}'">
                <div class="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md">
                    #${rank + 1}
                </div>
            </div>

            <!-- Innehållsbehållare -->
            <div class="p-6">
                <!-- Rubrik och grundinfo -->
                <div class="mb-4">
                    <h3 class="text-xl font-bold text-gray-900 mb-2 line-clamp-2">${car.ad.subject}</h3>
                    <div class="flex items-center space-x-4 text-sm text-gray-600">
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                            ${car.ad.mileage.toLocaleString()} km
                        </span>
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            ${car.ad.regDate}
                        </span>
                    </div>
                </div>

                <!-- Priser -->
                <div class="mb-6">
                    <div class="flex items-baseline justify-between mb-2">
                        <span class="text-sm text-gray-500 font-medium">Pris</span>
                        <span class="text-2xl font-bold text-gray-900">${car.ad.price.value.toLocaleString()} kr</span>
                    </div>
                    <div class="flex items-baseline justify-between">
                        <span class="text-sm text-gray-500">Nypris</span>
                        <span class="text-sm text-gray-900">${calculateNewPrice(car.ad.subject).toLocaleString()} kr</span>
                    </div>
                    <div class="flex items-baseline justify-between">
                        <span class="text-sm text-gray-500">Värdeminskning</span>
                        <span class="text-sm text-gray-900">${Math.round((1 - car.ad.price.value / calculateNewPrice(car.ad.subject)) * 100)}%</span>
                    </div>
                </div>

                <!-- Bilinfo -->
                <div class="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 class="text-sm font-semibold text-gray-900 mb-3">Bildetaljer</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Växellåda</span>
                            <span class="font-medium text-gray-900">${car.ad.gearbox || 'Automatisk'}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Motor</span>
                            <span class="font-medium text-gray-900">${car.ad.fuel_type || identifyEngine(car.ad.subject).toUpperCase()}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Utrustningsnivå</span>
                            <span class="font-medium text-gray-900">${identifyTrimLevel(car.ad.subject).charAt(0).toUpperCase() + identifyTrimLevel(car.ad.subject).slice(1)}</span>
                        </div>
                    </div>
                </div>

                <!-- Extrautrustning -->
                <div class="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 class="text-sm font-semibold text-gray-900 mb-3">Extrautrustning</h4>
                    <div class="flex flex-wrap gap-2">
                        ${extractFeatures(car.ad.subject).map(feature => `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ${feature}
                            </span>
                        `).join('')}
                    </div>
                </div>

                <!-- Månadskostnader -->
                <div class="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 class="text-sm font-semibold text-gray-900 mb-3">Finansiering & Kostnader</h4>
                    <!-- Finansieringsdetaljer -->
                    <div class="mb-4 pb-3 border-b border-gray-200">
                        <div class="flex justify-between text-sm mb-2">
                            <span class="text-gray-600">Kontantinsats (${(financingParams.downPayment * 100).toFixed(0)}%)</span>
                            <span class="font-medium text-gray-900">${Math.round(car.ad.price.value * financingParams.downPayment).toLocaleString()} kr</span>
                        </div>
                        <div class="flex justify-between text-sm mb-2">
                            <span class="text-gray-600">Lånebelopp</span>
                            <span class="font-medium text-gray-900">${Math.round(car.ad.price.value * (1 - financingParams.downPayment)).toLocaleString()} kr</span>
                        </div>
                        ${financingParams.loanTerm <= 60 ? `
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Restvärde (${financingParams.loanTerm === 36 ? '55' : financingParams.loanTerm === 48 ? '45' : '35'}%)</span>
                            <span class="font-medium text-gray-900">${Math.round(calculateResidualValue(car.ad.price.value, financingParams.loanTerm)).toLocaleString()} kr</span>
                        </div>
                        ` : ''}
                    </div>
                    <!-- Månadskostnader -->
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Finansiering</span>
                            <span class="font-medium text-gray-900">${Math.round(monthlyPayment).toLocaleString()} kr</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Skatt</span>
                            <span class="font-medium text-gray-900">${Math.round(monthlyTax).toLocaleString()} kr</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Försäkring</span>
                            <span class="font-medium text-gray-900">${Math.round(monthlyInsurance).toLocaleString()} kr</span>
                        </div>
                        <div class="flex justify-between pt-2 border-t border-gray-200 text-sm">
                            <span class="font-semibold text-gray-900">Totalt per månad</span>
                            <span class="font-bold text-blue-600">${Math.round(totalMonthlyCost).toLocaleString()} kr</span>
                        </div>
                    </div>
                </div>

                <!-- Utrustning -->
                <div class="mb-6">
                    <button onclick="toggleStandardEquipment('${car.ad.ad_id}')" 
                            class="w-full flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                        <span>Visa standardutrustning</span>
                        <svg class="w-5 h-5 transform transition-transform standard-equipment-arrow-${car.ad.ad_id}" 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    <div class="standard-equipment-${car.ad.ad_id} hidden mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                        <ul class="space-y-1">
                            ${getTrimLevelEquipment(trimLevel).map(item => `
                                <li class="flex items-center">
                                    <svg class="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    ${item}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between pt-4 border-t border-gray-200">
                    <a href="${car.ad.share_url}" target="_blank" 
                       class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        <span>Visa annons</span>
                        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                    </a>
                    <div class="text-sm text-gray-500">
                        ${car.ad.seller.type} | ${car.ad.seller.name}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Funktion för att hantera markering av bil
function handleCarSelect(carId) {
    selectedCarId = selectedCarId === carId ? null : carId;
    fetchAndRenderCars();
}

// Funktion för att sortera bilar
function sortCars(cars, sortBy) {
    switch (sortBy) {
        case 'price':
            return cars.sort((a, b) => a.car.ad.price.value - b.car.ad.price.value);
        case 'mileage':
            return cars.sort((a, b) => a.car.ad.mileage - b.car.ad.mileage);
        case 'year':
            return cars.sort((a, b) => b.car.ad.regDate - a.car.ad.regDate);
        case 'monthly':
            return cars.sort((a, b) => {
                const costA = calculateTotalMonthlyCost(a.car);
                const costB = calculateTotalMonthlyCost(b.car);
                return costA - costB;
            });
        case 'score':
        default:
            return cars.sort((a, b) => b.score - a.score);
    }
}

function calculateTotalMonthlyCost(car) {
    const monthlyPayment = calculateMonthlyPayment(
        car.ad.price.value,
        financingParams.downPayment,
        financingParams.interestRate,
        financingParams.loanTerm
    );
    const monthlyTax = calculateTax(car.ad.subject, car.ad.regDate) / 12;
    const monthlyInsurance = calculateInsurance(car.ad.subject);
    return monthlyPayment + monthlyTax + monthlyInsurance;
}

// Funktion för att skapa sorteringskontroller
function createSortControls() {
    return `
        <div class="flex flex-wrap gap-3">
            <button onclick="handleSort('score')" 
                    class="px-4 py-2 rounded-lg font-medium transition-colors ${currentSort === 'score' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                Poäng
            </button>
            <button onclick="handleSort('price')" 
                    class="px-4 py-2 rounded-lg font-medium transition-colors ${currentSort === 'price' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                Pris
            </button>
            <button onclick="handleSort('mileage')" 
                    class="px-4 py-2 rounded-lg font-medium transition-colors ${currentSort === 'mileage' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                Miltal
            </button>
            <button onclick="handleSort('year')" 
                    class="px-4 py-2 rounded-lg font-medium transition-colors ${currentSort === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                Årsmodell
            </button>
            <button onclick="handleSort('monthly')" 
                    class="px-4 py-2 rounded-lg font-medium transition-colors ${currentSort === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                Månadskostnad
            </button>
        </div>
    `;
}

// Funktion för att rendera bilar med sortering och filtrering
function renderCars(cars) {
    const carGrid = document.getElementById('carGrid');
    if (!carGrid) {
        console.error('Kunde inte hitta carGrid element');
        return;
    }

    // Filtrera bort privatleasingbilar (bilar med värde under 20 000 kr)
    const filteredCars = cars.filter(car => car.ad.price.value >= 20000);

    // Beräkna poäng för varje bil
    const scoredCars = filteredCars.map(car => ({
        car,
        score: calculateScore(car)
    }));

    // Sortera bilar enligt vald sortering
    const sortedCars = sortCars(scoredCars, currentSort);

    // Skapa huvudcontainer med maxbredd och centrering
    const mainContainer = document.createElement('div');
    mainContainer.className = 'w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8';

    // Skapa container för sorteringskontroller
    const sortControlsContainer = document.createElement('div');
    sortControlsContainer.className = 'bg-white rounded-lg shadow-lg p-6 mb-8';
    
    // Lägg till rubrik för sorteringskontroller
    const sortTitle = document.createElement('h2');
    sortTitle.className = 'text-xl font-semibold text-gray-800 mb-4';
    sortTitle.textContent = 'Sortering';
    sortControlsContainer.appendChild(sortTitle);
    
    // Lägg till sorteringsknappar med centrering
    const sortButtonsContainer = document.createElement('div');
    sortButtonsContainer.className = 'flex flex-wrap justify-center gap-3';
    sortButtonsContainer.innerHTML = createSortControls();
    sortControlsContainer.appendChild(sortButtonsContainer);

    // Skapa container för bilkort med förbättrad grid
    const carCardsContainer = document.createElement('div');
    carCardsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8';
    
    // Lägg till bilkort
    sortedCars.forEach((scoredCar, index) => {
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'w-full';
        const cardHtml = createCarCard(scoredCar.car, scoredCar.score, index, cars);
        cardWrapper.innerHTML = cardHtml;
        carCardsContainer.appendChild(cardWrapper);
    });

    // Rensa och lägg till nya containers
    carGrid.innerHTML = '';
    mainContainer.appendChild(sortControlsContainer);
    mainContainer.appendChild(carCardsContainer);
    carGrid.appendChild(mainContainer);
}

// Funktion för att uppdatera alla bilkort med nya finansieringsparametrar
function updateAllCarCards() {
    updateFinancingParams();
    if (currentCars.length > 0) {
        renderCars(currentCars);
    }
}

// Funktion för att hämta och rendera bilar
function fetchAndRenderCars() {
    const carGrid = document.getElementById('carGrid');
    if (!carGrid) {
        console.error('Kunde inte hitta carGrid element');
        return;
    }

    // Filtrera bort privatleasingbilar (bilar med värde under 20 000 kr)
    const filteredCars = currentCars.filter(car => car.ad.price.value >= 20000);

    // Beräkna poäng för varje bil
    const scoredCars = filteredCars.map(car => ({
        car,
        score: calculateScore(car)
    }));

    // Sortera bilar enligt vald sortering
    const sortedCars = sortCars(scoredCars, currentSort);

    // Skapa huvudcontainer med maxbredd och centrering
    const mainContainer = document.createElement('div');
    mainContainer.className = 'w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8';

    // Skapa container för sorteringskontroller
    const sortControlsContainer = document.createElement('div');
    sortControlsContainer.className = 'bg-white rounded-lg shadow-lg p-6 mb-8';
    
    // Lägg till rubrik för sorteringskontroller
    const sortTitle = document.createElement('h2');
    sortTitle.className = 'text-xl font-semibold text-gray-800 mb-4';
    sortTitle.textContent = 'Sortering';
    sortControlsContainer.appendChild(sortTitle);
    
    // Lägg till sorteringsknappar med centrering
    const sortButtonsContainer = document.createElement('div');
    sortButtonsContainer.className = 'flex flex-wrap justify-center gap-3';
    sortButtonsContainer.innerHTML = createSortControls();
    sortControlsContainer.appendChild(sortButtonsContainer);

    // Skapa container för bilkort med förbättrad grid
    const carCardsContainer = document.createElement('div');
    carCardsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8';
    
    // Lägg till bilkort
    sortedCars.forEach((scoredCar, index) => {
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'w-full';
        const cardHtml = createCarCard(scoredCar.car, scoredCar.score, index, currentCars);
        cardWrapper.innerHTML = cardHtml;
        carCardsContainer.appendChild(cardWrapper);
    });

    // Rensa och lägg till nya containers
    carGrid.innerHTML = '';
    mainContainer.appendChild(sortControlsContainer);
    mainContainer.appendChild(carCardsContainer);
    carGrid.appendChild(mainContainer);
}

// Funktion för att hantera sortering
function handleSort(sortType) {
    currentSort = sortType;
    fetchAndRenderCars();
}

// Funktion för att visa/dölja standardutrustning
function toggleStandardEquipment(carId) {
    const equipmentDiv = document.querySelector(`.standard-equipment-${carId}`);
    const arrow = document.querySelector(`.standard-equipment-arrow-${carId}`);
    
    if (equipmentDiv && arrow) {
        equipmentDiv.classList.toggle('hidden');
        arrow.style.transform = equipmentDiv.classList.contains('hidden') ? '' : 'rotate(180deg)';
    }
}

// Funktion för att hämta bildata
async function fetchCars() {
    try {
        const response = await fetch('/data/cars.json');
        const data = await response.json();
        currentCars = data.data;
        fetchAndRenderCars();
    } catch (error) {
        console.error('Fel vid hämtning av bildata:', error);
    }
}

// Initiera finansieringsformulär när DOM:en är laddad
document.addEventListener('DOMContentLoaded', () => {
    // Initiera finansieringsformulär
    const downPaymentInput = document.getElementById('downPayment');
    const interestRateInput = document.getElementById('interestRate');
    const loanTermInput = document.getElementById('loanTerm');

    if (downPaymentInput && interestRateInput && loanTermInput) {
        // Sätt standardvärden
        downPaymentInput.value = financingParams.downPayment * 100;
        interestRateInput.value = financingParams.interestRate * 100;
        loanTermInput.value = financingParams.loanTerm;

        // Lägg till event listeners
        downPaymentInput.addEventListener('input', updateAllCarCards);
        interestRateInput.addEventListener('input', updateAllCarCards);
        loanTermInput.addEventListener('change', updateAllCarCards);
    }

    // Hämta och visa bilar
    fetchCars();
});

// Exportera funktioner globalt
window.updateAllCarCards = updateAllCarCards;
window.fetchAndRenderCars = fetchAndRenderCars;
window.handleSort = handleSort;
window.handleCarSelect = handleCarSelect;
window.toggleStandardEquipment = toggleStandardEquipment;

// Funktion för att uppdatera annonser
async function updateListings() {
    try {
        // Visa laddningsindikator på knappen
        const button = document.querySelector('button[onclick="updateListings()"]');
        const originalContent = button.innerHTML;
        button.innerHTML = `
            <svg class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Uppdaterar...
        `;
        button.disabled = true;

        // Anropa servern för att uppdatera annonser
        await fetch('http://localhost:8000/update', {
            method: 'POST'
        });

        // Vänta lite och hämta sedan den uppdaterade datan
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchCars();

        // Återställ knappen
        button.innerHTML = originalContent;
        button.disabled = false;

    } catch (error) {
        console.error('Fel vid uppdatering av annonser:', error);
        alert('Kunde inte uppdatera annonserna. Försök igen senare.');
        
        // Återställ knappen vid fel
        const button = document.querySelector('button[onclick="updateListings()"]');
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}

// Exportera funktioner globalt
window.updateListings = updateListings;