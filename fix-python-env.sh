#!/bin/bash
if [ ! -f "/root/app/blocket_api.py" ]; then echo "ERROR: blocket_api.py saknas i /root/app/"; exit 1; fi
pip install -r requirements.txt
export PYTHONPATH=/root/app:$PYTHONPATH
systemctl restart blocket-app
echo "Klar! Kontrollera status med: systemctl status blocket-app"
