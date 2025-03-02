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
ExecStart=/root/app/venv/bin/python /root/app/main.py
Restart=always
StandardOutput=append:/var/log/blocket-app.log
StandardError=append:/var/log/blocket-app.error.log
[Install]
WantedBy=multi-user.target
EOL

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
netstat -tulpn | grep python

echo -e "\n=== Fullständig service-status ==="
systemctl status blocket-app --no-pager

echo -e "\n=== Filer i app-katalogen ==="
ls -la /root/app/
