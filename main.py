from blocket_api import BlocketAPI
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import webbrowser
import os
import time

# API setup
client_id = "54fdbd1aa24e7b191d360df8"
client_secret = "ba08537bc98613171710be40b09f0111ce1d2917"
api = BlocketAPI(client_secret)

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
                # Läs request body
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length:
                    self.rfile.read(content_length)
                
                # Uppdatera annonser
                print("Uppdaterar annonser via API...")
                update_listings()
                
                # Skicka response
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

# Starta webbserver
def run_server():
    server = HTTPServer(('localhost', 8000), RequestHandler)
    print("Server started at http://localhost:8000")
    server.serve_forever()

if __name__ == "__main__":
    print("Hämtar annonser...")
    update_listings()
    print("Data uppdaterad!")
    
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()
    
    webbrowser.open('http://localhost:8000')
    
    try:
        while True:
            input("Tryck Enter för att uppdatera listings (eller Ctrl+C för att avsluta)...")
            print("Hämtar annonser...")
            update_listings()
            print("Data uppdaterad!")
    except KeyboardInterrupt:
        print("\nAvslutar programmet...")


