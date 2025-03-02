#!/bin/bash
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
systemctl daemon-reload
systemctl restart blocket-app
systemctl status blocket-app
