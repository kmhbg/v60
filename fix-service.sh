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
[Install]
WantedBy=multi-user.target
EOL

echo "=== Startar om systemd och applikationen ==="
systemctl daemon-reload
systemctl restart blocket-app
sleep 2  # Vänta lite så att servicen hinner starta

echo -e "\n=== Verifierar service-status ==="
if systemctl is-active --quiet blocket-app; then
    echo "✓ Service är aktiv"
else
    echo "✗ Service är INTE aktiv"
fi

echo -e "\n=== Kontrollerar Python-process ==="
if pgrep -f "/root/app/venv/bin/python /root/app/main.py" > /dev/null; then
    echo "✓ Python-process körs"
else
    echo "✗ Python-process hittades INTE"
fi

echo -e "\n=== Senaste loggraderna ==="
journalctl -u blocket-app -n 5 --no-pager

echo -e "\n=== Nätverksanslutningar ==="
netstat -tulpn | grep python

echo -e "\n=== Fullständig service-status ==="
systemctl status blocket-app
