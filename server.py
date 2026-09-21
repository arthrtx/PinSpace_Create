from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    print("Servidor anti-cache ativo em http://localhost:8000")
    HTTPServer(("localhost", 8000), NoCacheHandler).serve_forever()