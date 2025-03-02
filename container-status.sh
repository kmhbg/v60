#!/usr/bin/env bash

# Färger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Kontrollera om container-ID angetts
if [ -z "$1" ]; then
    echo -e "${RED}[ERROR]${NC} Ange container-ID som parameter"
    echo "Användning: $0 <CONTAINER_ID>"
    echo
    echo "Tillgängliga containers:"
    pct list
    exit 1
fi

CONTAINER_ID="$1"

# Funktioner
header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

check() {
    echo -e "${GREEN}[*]${NC} $1"
    eval "$2"
    echo
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
echo -e "\n${YELLOW}Container Status Check${NC}\n"

header "CONTAINER INFORMATION"
check "Container Status:" "pct status $CONTAINER_ID"
check "Container IP:" "pct exec $CONTAINER_ID -- ip addr show eth0 | grep 'inet '"

header "APPLICATION STATUS"
check "Blocket App Status:" "pct exec $CONTAINER_ID -- systemctl status blocket-app | grep -E 'Active|Memory|Tasks'"
check "Python Processer:" "pct exec $CONTAINER_ID -- ps aux | grep python | grep -v grep"
check "Nätverksanslutningar:" "pct exec $CONTAINER_ID -- netstat -tulpn | grep python"

header "CRON STATUS"
check "Cron Jobs:" "pct exec $CONTAINER_ID -- crontab -l"

header "DISK & MEMORY"
check "Diskutrymme:" "pct exec $CONTAINER_ID -- df -h /root/app"
check "Minnesutnyttjande:" "pct exec $CONTAINER_ID -- free -h"

header "SENASTE LOGGAR"
check "Systemd Loggar:" "pct exec $CONTAINER_ID -- journalctl -u blocket-app -n 10 --no-pager"

header "APP FILER"

header "PYTHON MILJÖ"
check "Virtual Environment:" "pct exec $CONTAINER_ID -- ls -la /root/app/venv"
check "Venv Python Packages:" "pct exec $CONTAINER_ID -- /root/app/venv/bin/pip list"
check "System Python Packages:" "pct exec $CONTAINER_ID -- pip list"
check "Python Sökväg:" "pct exec $CONTAINER_ID -- python3 -c 'import sys; print(sys.path)'"

check "App Katalog:" "pct exec $CONTAINER_ID -- ls -la /root/app"
check "Data Katalog:" "pct exec $CONTAINER_ID -- ls -la /root/app/data"

echo -e "\n${GREEN}Status-kontroll slutförd!${NC}\n" 