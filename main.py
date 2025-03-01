from blocket_api import BlocketAPI
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import webbrowser
import os
import time
import sys
from dotenv import load_dotenv

# Ladda miljövariabler från .env filen
load_dotenv()

# Hämta miljövariabler
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
PORT = int(os.getenv('PORT', 8000))  # Ändrad standardport till 8080
HOST = os.getenv('HOST', 'localhost')

# Validera nödvändiga miljövariabler
if not CLIENT_SECRET:
    raise ValueError("CLIENT_SECRET måste anges i .env filen")

# API setup
api = BlocketAPI(CLIENT_SECRET)

def update_listings():
    print("Hämtar annonser från Blocket API...")
    listing = api.get_listings("10205922")
    
    print("Sparar data till JSON-fil...")
    # Spara JSON till fil
    with open('data/cars.json', 'w', encoding='utf-8') as f:
        json.dump(listing, f, ensure_ascii=False, indent=4)
    print("Klar!")

# Skapa data-mappen om den inte finns
os.makedirs('data', exist_ok=True)

# Webbserver klass
class RequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/update':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length:
                    self.rfile.read(content_length)
                
                print("Uppdaterar annonser via API...")
                update_listings()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = json.dumps({"status": "success"})
                self.wfile.write(response.encode('utf-8'))
                print("Uppdatering klar!")
                
            except Exception as e:
                print(f"Fel vid uppdatering: {str(e)}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = json.dumps({"error": str(e)})
                self.wfile.write(response.encode('utf-8'))
                return
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = json.dumps({"error": "Not found"})
            self.wfile.write(response.encode('utf-8'))

def run_server():
    try:
        server = HTTPServer((HOST, PORT), RequestHandler)
        print(f"Server started at http://{HOST}:{PORT}")
        server.serve_forever()
    except PermissionError:
        print(f"\nFEL: Kunde inte starta servern på port {PORT}.")
        print("Tips: Använd en port över 1024 eller kör med sudo")
        print("Du kan ändra porten i .env filen eller köra med:")
        print(f"sudo PORT={PORT} python main.py\n")
        sys.exit(1)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"\nFEL: Port {PORT} används redan av en annan process.")
            print("Tips: Välj en annan port i .env filen eller avsluta processen som använder porten\n")
        else:
            print(f"\nFEL: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("Hämtar annonser...")
    update_listings()
    print("Data uppdaterad!")
    
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()
    
    try:
        while True:
            input("Tryck Enter för att uppdatera listings (eller Ctrl+C för att avsluta)...")
            print("Hämtar annonser...")
            update_listings()
            print("Data uppdaterad!")
    except KeyboardInterrupt:
        print("\nAvslutar programmet...")


