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

## Miljövariabler

Applikationen använder följande miljövariabler som måste konfigureras i en `.env` fil:

```env
# API Credentials
CLIENT_SECRET=your_client_secret_here

# Server Settings
PORT=8080
HOST=localhost
```

En `.env.example` fil finns tillgänglig som mall. Kopiera den till `.env` och uppdatera värdena:
```bash
cp .env.example .env
```

## Installation

### Lokal Installation

1. Klona repot:
```bash
git clone https://github.com/[ditt-användarnamn]/blocket.git
cd blocket
```

2. Skapa och aktivera virtuell miljö:
```bash
python3 -m venv venv
source venv/bin/activate  # På Windows: venv\Scripts\activate
```

3. Installera beroenden:
```bash
pip install -r requirements.txt
```

4. Konfigurera miljövariabler:
```bash
cp .env.example .env
# Redigera .env med dina värden
```

5. Starta servern:
```bash
python main.py
```

### Proxmox Installation

För att deploya applikationen i en Proxmox LXC container:

1. Kopiera `deploy.sh` till din Proxmox-host

2. Kör installationsscriptet med ditt client secret:
```bash
chmod +x deploy.sh
./deploy.sh "ditt-client-secret-här"
```

Scriptet kommer att:
- Skapa en LXC container med Debian 12
- Installera alla nödvändiga paket
- Konfigurera automatiska uppdateringar från GitHub
- Starta applikationen som en systemd-tjänst

## Teknisk Översikt

### Frontend
- Vanilla JavaScript
- Tailwind CSS för styling
- Responsiv design för alla skärmstorlekar

### Backend
- Python SimpleHTTPServer
- JSON-datahantering
- CORS-stöd för API-anrop
- Automatisk uppdatering via cron
- Virtual environment för isolerade beroenden

## Användning

1. **Sök Bilar**: Bläddra genom tillgängliga bilar som automatiskt rankas efter värde
2. **Finansieringsalternativ**: Justera kontantinsats och låneperiod för att se olika scenarios
3. **Jämför Kostnader**: Se total månadskostnad inklusive skatt, försäkring och finansiering
4. **Detaljerad Information**: Klicka på en bil för att se all tillgänglig information

## Utveckling

För att bidra till projektet:

1. Forka repot
2. Skapa en feature branch (`git checkout -b feature/AmazingFeature`)
3. Commita dina ändringar (`git commit -m 'Add some AmazingFeature'`)
4. Pusha till branchen (`git push origin feature/AmazingFeature`)
5. Öppna en Pull Request

### Viktigt
- Lägg aldrig till `.env` filen i Git
- Uppdatera `requirements.txt` när du lägger till nya beroenden
- Följ befintlig kodstil och dokumentationsformat

## Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.

## Felsökning

### Portbehörigheter
Om du får felmeddelandet "Permission denied" när du startar servern:

1. Använd en port över 1024 i `.env` filen:
```env
PORT=8000
```

2. Eller kör programmet med sudo:
```bash
sudo PORT=8000 python main.py
```

### Porten används redan
Om du får felmeddelandet "Address already in use":

1. Välj en annan port i `.env` filen
2. Eller hitta och avsluta processen som använder porten:
```bash
# Hitta process som använder porten
lsof -i :8000

# Avsluta processen
kill -9 <PID>
```

### Vanliga Problem

1. **Miljövariabler saknas**
   - Kontrollera att `.env` filen finns och innehåller rätt värden
   - Kör `cp .env.example .env` och uppdatera värdena

2. **Python-beroenden**
   - Kontrollera att virtual environment är aktiverat
   - Kör `pip install -r requirements.txt` igen

3. **Behörighetsproblem i Proxmox**
   - Kontrollera att containern har rätt rättigheter
   - Se till att nätverksinterface är korrekt konfigurerat

4. **Uppdateringar fungerar inte**
   - Kontrollera att cron-jobbet är aktivt: `crontab -l`
   - Verifiera att Git-repot är korrekt konfigurerat

För mer hjälp, öppna ett ärende på GitHub med:
- Felmeddelandet
- Din systemkonfiguration
- Innehållet i relevanta loggfiler 