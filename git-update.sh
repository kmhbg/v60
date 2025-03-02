#!/usr/bin/env bash

# Färger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Funktioner
msg() {
    echo -e "${GREEN}[*]${NC} ${1}"
}

info() {
    echo -e "${BLUE}[i]${NC} ${1}"
}

warn() {
    echo -e "${YELLOW}[!]${NC} ${1}"
}

# Visa aktuell Git-status
echo
msg "Aktuell Git-status:"
git status -s
echo

# Kontrollera om det finns ändringar
if [[ -z $(git status -s) ]]; then
    info "Inga ändringar att committa"
    exit 0
fi

# Fråga efter commit-meddelande
read -p "Ange commit-meddelande: " commit_message

if [[ -z "$commit_message" ]]; then
    warn "Inget commit-meddelande angivet, använder standardmeddelande"
    commit_message="Uppdaterat filer"
fi

# Lägg till alla ändringar
msg "Lägger till ändrade filer..."
git add .

# Commit
msg "Skapar commit..."
git commit -m "$commit_message"

# Push
msg "Pushar till GitHub..."
git push origin main

# Visa resultat
echo
if [ $? -eq 0 ]; then
    msg "Uppdatering klar! 🎉"
    echo
    info "Commit-meddelande: $commit_message"
    echo
else
    warn "Något gick fel vid push till GitHub"
    echo
fi 