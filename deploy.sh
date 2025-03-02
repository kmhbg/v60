#!/usr/bin/env bash

# Färger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funktioner
msg() {
    echo -e "${GREEN}[*]${NC} ${1}"
}

warn() {
    echo -e "${YELLOW}[!]${NC} ${1}"
}

error() {
    echo -e "${RED}[ERROR]${NC} ${1}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Detta script måste köras som root"
        exit 1
    fi
}

check_pve() {
    if [ ! -f /etc/pve/local/pve-ssl.key ]; then
        error "Detta script måste köras på en Proxmox VE host"
        exit 1
    fi
}

get_latest_version() {
    msg "Hämtar senaste versionen från GitHub..."
    LATEST_VERSION=$(curl -s https://api.github.com/repos/kmhbg/v60/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
    if [ -z "$LATEST_VERSION" ]; then
        warn "Kunde inte hämta senaste versionen, använder main branch"
        LATEST_VERSION="main"
    fi
}

# Huvudprogram
clear
cat << "EOF"
    ____  __           __        __     ___                
   / __ )/ /___  _____/ /_____  / /_   /   |  ____  ____  
  / __  / / __ \/ ___/ //_/ _ \/ __/  / /| | / __ \/ __ \ 
 / /_/ / / /_/ / /__/ ,< /  __/ /_   / ___ |/ /_/ / /_/ / 
/_____/_/\____/\___/_/|_|\___/\__/  /_/  |_/ .___/ .___/  
                                          /_/   /_/        
EOF
echo

# Kontrollera root och PVE
check_root
check_pve

# Fråga efter CLIENT_SECRET om det inte angetts som parameter
if [ -z "$1" ]; then
    read -p "Ange ditt CLIENT_SECRET: " CLIENT_SECRET
else
    CLIENT_SECRET="$1"
fi

if [ -z "$CLIENT_SECRET" ]; then
    error "CLIENT_SECRET måste anges"
    exit 1
fi

# Konstanter
CONTAINER_ID=$(pvesh get /cluster/nextid)
CONTAINER_NAME="blocket-app"
CONTAINER_PASSWORD="$(openssl rand -base64 32)"
CONTAINER_MEMORY=2048
CONTAINER_CORES=2
CONTAINER_STORAGE=8
GITHUB_REPO="https://github.com/kmhbg/v60.git"
HOST="0.0.0.0"
PORT="8080"

# Skapa LXC container
msg "Skapar LXC container..."
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
msg "Startar containern..."
pct start $CONTAINER_ID
sleep 10

# Installera nödvändiga paket
msg "Installerar nödvändiga paket..."
pct exec $CONTAINER_ID -- bash -c 'apt-get update && apt-get install -y python3 python3-pip git cron curl python3-venv'

# Klona repository
msg "Klonar repository..."
pct exec $CONTAINER_ID -- bash -c "git clone $GITHUB_REPO /root/app"

# Skapa och aktivera virtuell miljö
msg "Sätter upp Python-miljö..."
pct exec $CONTAINER_ID -- bash -c "cd /root/app && python3 -m venv venv && source venv/bin/activate && pip install --upgrade pip"

# Installera Python-beroenden
msg "Installerar Python-beroenden..."
pct exec $CONTAINER_ID -- bash -c "cd /root/app && source venv/bin/activate && pip install -r requirements.txt"

# Skapa .env fil
msg "Konfigurerar miljövariabler..."
cat > env_file << EOF
# API Credentials
CLIENT_SECRET=$CLIENT_SECRET

# Server Settings
PORT=$PORT
HOST=$HOST
EOF

# Kopiera .env fil till containern
pct push $CONTAINER_ID env_file /root/app/.env
pct exec $CONTAINER_ID -- bash -c "chmod 600 /root/app/.env"

# Skapa uppdateringsscript
msg "Konfigurerar automatiska uppdateringar..."
cat > update_script.sh << 'EOF'
#!/bin/bash
cd /root/app
source venv/bin/activate
git fetch
if [ $(git rev-parse HEAD) != $(git rev-parse @{u}) ]; then
    cp .env .env.backup
    git pull
    mv .env.backup .env
    pip install -r requirements.txt
    systemctl restart blocket-app
fi
EOF

# Kopiera och gör uppdateringsscript körbart
pct push $CONTAINER_ID update_script.sh /root/update_script.sh
pct exec $CONTAINER_ID -- bash -c "chmod +x /root/update_script.sh"

# Skapa systemd service
msg "Konfigurerar systemd service..."
cat > blocket-app.service << 'EOF'
[Unit]
Description=Blocket App Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/app
Environment=PATH=/root/app/venv/bin:$PATH
ExecStart=/root/app/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Kopiera och aktivera systemd service
pct push $CONTAINER_ID blocket-app.service /etc/systemd/system/blocket-app.service
pct exec $CONTAINER_ID -- bash -c "systemctl enable blocket-app && systemctl start blocket-app"

# Lägg till cron-jobb för automatisk uppdatering
msg "Konfigurerar automatisk uppdatering..."
pct exec $CONTAINER_ID -- bash -c '(crontab -l 2>/dev/null; echo "*/5 * * * * /root/update_script.sh") | crontab -'

# Ta bort temporära filer
rm env_file update_script.sh blocket-app.service

# Hämta container IP
CONTAINER_IP=$(pct exec $CONTAINER_ID -- bash -c "ip addr show eth0 | grep 'inet ' | awk '{print \$2}' | cut -d/ -f1")

# Skriv ut information
echo
msg "Installation klar!"
echo -e "${BLUE}Container Information:${NC}"
echo "ID: $CONTAINER_ID"
echo "Namn: $CONTAINER_NAME"
echo "IP: $CONTAINER_IP"
echo "Port: $PORT"
echo "Lösenord: $CONTAINER_PASSWORD"
echo
echo -e "${GREEN}Applikationen är tillgänglig på:${NC} http://${CONTAINER_IP}:${PORT}"
echo
warn "Spara denna information på ett säkert ställe!" 