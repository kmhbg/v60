#!/bin/bash

# Skapa service-filen
cat > /etc/systemd/system/blocket-app.service << EOL
[Unit]
Description=Blocket App Service
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=/root/app
Environment=PYTHONPATH=/root/app
Environment=RUN_AS_SERVICE=1
ExecStart=/root/app/venv/bin/python /root/app/main.py
Restart=always
StandardOutput=append:/var/log/blocket-app.log
StandardError=append:/var/log/blocket-app.error.log
[Install]
WantedBy=multi-user.target
EOL

# Uppdatera main.py för att hantera service-läge
cat > /root/app/main.py.tmp << 'EOL'
import os
import time
from blocket_api import BlocketAPI
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer
import threading
from dotenv import load_dotenv

# Ladda miljövariabler från .env
load_dotenv()

def update_listings():
    print("Hämtar annonser från Blocket API...")
    token = os.getenv('BLOCKET_TOKEN')
    if not token:
        print("ERROR: BLOCKET_TOKEN saknas i .env-filen")
        return
        
    api = BlocketAPI(token)
    data = api.get_listings()
    
    print("Sparar data till JSON-fil...")
    with open('data/listings.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("Klar!")
    print("Data uppdaterad!")

def run_server():
    server = HTTPServer(('0.0.0.0', 8080), SimpleHTTPRequestHandler)
    print("Server started at http://0.0.0.0:8080")
    server.serve_forever()

def main():
    # Kontrollera att .env finns
    if not os.path.exists('.env'):
        print("ERROR: .env-fil saknas")
        return
        
    # Starta webbservern i en separat tråd
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    while True:
        update_listings()
        # Om vi kör som service, uppdatera var 5:e minut
        if os.environ.get('RUN_AS_SERVICE'):
            time.sleep(300)  # 5 minuter
        else:
            input("Tryck Enter för att uppdatera listings (eller Ctrl+C för att avsluta)...")

if __name__ == "__main__":
    main()
EOL

# Säkerhetskopiera original main.py och installera den nya versionen
cp /root/app/main.py /root/app/main.py.backup
mv /root/app/main.py.tmp /root/app/main.py

# Kontrollera att .env finns och har rätt innehåll
if [ ! -f "/root/app/.env" ]; then
    echo "ERROR: .env-fil saknas i /root/app/"
    if [ -f "/root/app/.env.example" ]; then
        echo "Kopierar .env.example till .env"
        cp /root/app/.env.example /root/app/.env
        echo "OBS: Du behöver uppdatera BLOCKET_TOKEN i .env-filen!"
    fi
fi

echo "=== Förbereder loggfiler ==="
touch /var/log/blocket-app.log /var/log/blocket-app.error.log
chmod 644 /var/log/blocket-app.log /var/log/blocket-app.error.log

echo "=== Kontrollerar Python-miljön ==="
echo "Python version:"
/root/app/venv/bin/python --version
echo -e "\nPython sökväg:"
/root/app/venv/bin/python -c "import sys; print('\n'.join(sys.path))"
echo -e "\nInstallerade paket:"
/root/app/venv/bin/pip list

echo -e "\n=== Testar Python-skriptet manuellt ==="
cd /root/app
/root/app/venv/bin/python -c "import blocket_api; print('✓ Kan importera blocket_api')" || echo "✗ Kan INTE importera blocket_api"

echo -e "\n=== Startar om systemd och applikationen ==="
systemctl daemon-reload
systemctl restart blocket-app
sleep 2  # Vänta lite så att servicen hinner starta

echo -e "\n=== Verifierar service-status ==="
if systemctl is-active --quiet blocket-app; then
    echo "✓ Service är aktiv"
else
    echo "✗ Service är INTE aktiv"
    echo -e "\n=== Felmeddelanden ==="
    tail -n 20 /var/log/blocket-app.error.log
fi

echo -e "\n=== Kontrollerar Python-process ==="
if pgrep -f "/root/app/venv/bin/python /root/app/main.py" > /dev/null; then
    echo "✓ Python-process körs"
else
    echo "✗ Python-process hittades INTE"
fi

echo -e "\n=== Senaste loggraderna ==="
echo "Standard output:"
tail -n 5 /var/log/blocket-app.log
echo -e "\nError output:"
tail -n 5 /var/log/blocket-app.error.log

echo -e "\n=== Nätverksanslutningar ==="
if command -v netstat > /dev/null; then
    netstat -tulpn | grep python
else
    ss -tulpn | grep python
fi

echo -e "\n=== Fullständig service-status ==="
systemctl status blocket-app --no-pager

echo -e "\n=== Filer i app-katalogen ==="
ls -la /root/app/
