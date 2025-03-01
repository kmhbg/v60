# Blocket Bilfinansiering

Ett verktyg för att analysera och jämföra bilannonser från Blocket, med fokus på finansiering och totala ägandekostnader.

## Funktioner

- 🚗 **Smart Bilsökning**: Analyserar och rankar bilar baserat på pris, utrustning och skick
- 💰 **Finansieringsberäkning**: 
  - Beräknar månadskostnad med olika kontantinsatser
  - Visar restvärde för olika finansieringsperioder
  - Flexibla lånevillkor (36-72 månader)
- 📊 **Kostnadskalkyl**:
  - Fordonsskatt baserad på motortyp och registreringsdatum
  - Försäkringskostnad
  - Total månadskostnad inklusive alla avgifter
- 🔍 **Detaljerad Bilinformation**:
  - Utrustningsnivå och extrautrustning
  - Värdeminskning och nypris
  - Växellåda och bränsletyp

## Installation

1. Klona repot:
```bash
git clone https://github.com/[ditt-användarnamn]/blocket.git
cd blocket
```

2. Starta servern:
```bash
python main.py
```

3. Öppna webbläsaren och gå till:
```
http://localhost:8000
```

## Teknisk Översikt

### Frontend
- Vanilla JavaScript
- Tailwind CSS för styling
- Responsiv design för alla skärmstorlekar

### Backend
- Python SimpleHTTPServer
- JSON-datahantering
- CORS-stöd för API-anrop

## Användning

1. **Sök Bilar**: Bläddra genom tillgängliga bilar som automatiskt rankas efter värde
2. **Finansieringsalternativ**: Justera kontantinsats och låneperiod för att se olika scenarios
3. **Jämför Kostnader**: Se total månadskostnad inklusive skatt, försäkring och finansiering
4. **Detaljerad Information**: Klicka på en bil för att se all tillgänglig information

## Bidra

Känner du att du vill bidra till projektet? Här är hur du kan hjälpa till:

1. Forka repot
2. Skapa en feature branch (`git checkout -b feature/AmazingFeature`)
3. Commita dina ändringar (`git commit -m 'Add some AmazingFeature'`)
4. Pusha till branchen (`git push origin feature/AmazingFeature`)
5. Öppna en Pull Request

## Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer. 