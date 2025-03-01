#!/bin/bash

# Kontrollera om client_secret angetts som parameter
if [ -z "$1" ]; then
    echo "Error: CLIENT_SECRET måste anges som parameter"
    echo "Användning: ./deploy.sh <CLIENT_SECRET>"
    exit 1
fi

CLIENT_SECRET="$1"

# Konstanter
CONTAINER_ID=1000
CONTAINER_NAME="blocket-app"
CONTAINER_PASSWORD="$(openssl rand -base64 32)"
CONTAINER_MEMORY=2048
CONTAINER_CORES=2
CONTAINER_STORAGE=8
GITHUB_REPO="http://github.com/kmhbg/v60"

# Skapa LXC container
pct create $CONTAINER_ID local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
    --hostname $CONTAINER_NAME \
    --memory $CONTAINER_MEMORY \
    --cores $CONTAINER_CORES \
    --rootfs local-lvm:$CONTAINER_STORAGE \
    --net0 name=eth0,bridge=vmbr0,ip=dhcp \
    --password "$CONTAINER_PASSWORD" \
    --unprivileged 1 \
    --features nesting=1

# Starta containern
pct start $CONTAINER_ID

# Vänta på att containern ska starta
sleep 10

# Installera nödvändiga paket
pct exec $CONTAINER_ID -- bash -c 'apt-get update && apt-get install -y python3 python3-pip git cron curl'

# Klona repository
pct exec $CONTAINER_ID -- bash -c "git clone $GITHUB_REPO /root/app"

# Installera Python-beroenden
pct exec $CONTAINER_ID -- bash -c "cd /root/app && pip3 install -r requirements.txt python-dotenv"

# Skapa .env fil
cat > env_file << EOF
# API Credentials
CLIENT_SECRET=$CLIENT_SECRET

# Server Settings
PORT=$PORT
HOST=$HOST
EOF

# Kopiera .env fil till containern
pct push $CONTAINER_ID env_file /root/app/.env
pct exec $CONTAINER_ID -- bash -c "chmod 600 /root/app/.env"  # Sätt säkra rättigheter

# Skapa uppdateringsscript
cat > update_script.sh << 'EOF'
#!/bin/bash
cd /root/app
git fetch
if [ $(git rev-parse HEAD) != $(git rev-parse @{u}) ]; then
    git pull
    # Bevara .env filen vid uppdateringar
    if [ -f .env.backup ]; then
        mv .env.backup .env
    else
        cp .env .env.backup
    fi
    systemctl restart blocket-app
fi
EOF

# Kopiera och gör uppdateringsscript körbart
pct push $CONTAINER_ID update_script.sh /root/update_script.sh
pct exec $CONTAINER_ID -- bash -c "chmod +x /root/update_script.sh"

# Skapa systemd service
cat > blocket-app.service << 'EOF'
[Unit]
Description=Blocket App Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/app
ExecStart=/usr/bin/python3 main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Kopiera och aktivera systemd service
pct push $CONTAINER_ID blocket-app.service /etc/systemd/system/blocket-app.service
pct exec $CONTAINER_ID -- bash -c "systemctl enable blocket-app && systemctl start blocket-app"

# Lägg till cron-jobb för automatisk uppdatering (var 5:e minut)
pct exec $CONTAINER_ID -- bash -c '(crontab -l 2>/dev/null; echo "*/5 * * * * /root/update_script.sh") | crontab -'

# Ta bort temporära filer
rm env_file

# Skriv ut information
echo "Container skapad med ID: $CONTAINER_ID"
echo "Lösenord: $CONTAINER_PASSWORD"
echo "Applikationen är tillgänglig på: http://[container-ip]:8000"
echo "Automatisk uppdatering är konfigurerad var 5:e minut" 