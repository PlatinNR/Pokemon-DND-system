import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 3000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"================================================================")
    print(f"  Pokemon Pen & Paper - Schwarz & Weiss Kompendium (Gen 1-5)")
    print(f"================================================================")
    print(f"  Server laeuft auf: http://localhost:{PORT}")
    print(f"  Druecke Strg + C zum Beenden.")
    print(f"================================================================")

    # Open browser automatically after server start
    webbrowser.open(f"http://localhost:{PORT}")

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer beendet.")

if __name__ == "__main__":
    main()
