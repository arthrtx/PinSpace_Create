"""PinSpace Create — servidor local (estática + API de quadros públicos).

Executar a partir da pasta do projeto:
    python server.py

Depois abrir:  http://127.0.0.1:8000

Os quadros públicos ficam guardados em data/public.json (a "base de dados").
Para publicar/ver quadros públicos é preciso servir o site por este servidor;
abrir o index.html diretamente continua a funcionar, mas sem a parte pública.
"""

import json
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
PUBLIC_DB = os.path.join(DATA_DIR, 'public.json')
PORT = int(os.environ.get('PORT', '8000'))
MAX_BODY = 25 * 1024 * 1024  # 25 MB

LOCK = threading.Lock()

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
}


def load_db():
    with LOCK:
        if not os.path.exists(PUBLIC_DB):
            return {'items': []}
        try:
            with open(PUBLIC_DB, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {'items': []}


def save_db(db):
    with LOCK:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = PUBLIC_DB + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(db, f, ensure_ascii=False)
        os.replace(tmp, PUBLIC_DB)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def read_body(handler):
    length = int(handler.headers.get('Content-Length') or 0)
    if length <= 0:
        return None
    if length > MAX_BODY:
        handler.send_error(413, 'Body too large')
        return None
    return handler.rfile.read(length)


def send_json(handler, obj, status=200):
    body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Content-Length', str(len(body)))
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):
        pass

    def _send_static(self, path):
        if path == '/':
            path = '/index.html'
        rel = path.lstrip('/')
        full = os.path.normpath(os.path.join(BASE_DIR, rel))
        if not full.startswith(BASE_DIR):
            self.send_error(403)
            return
        if not os.path.isfile(full):
            self.send_error(404)
            return
        ext = os.path.splitext(full)[1].lower()
        ctype = MIME.get(ext, 'application/octet-stream')
        size = os.path.getsize(full)
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(size))
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        with open(full, 'rb') as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)

    def _api(self, method):
        path = self.path.split('?', 1)[0]
        if path == '/api/public':
            if method == 'GET':
                db = load_db()
                items = sorted(db['items'], key=lambda x: x.get('atualizado', ''), reverse=True)
                send_json(self, {
                    'status': 'ok',
                    'collages': [{
                        'id': it['id'],
                        'titulo': it.get('titulo', 'Sem título'),
                        'autor': it.get('autor', 'Anónimo'),
                        'thumb': it.get('thumb'),
                        'atualizado': it.get('atualizado')
                    } for it in items[:60]]
                })
                return
            if method in ('POST', 'PUT'):
                data = read_body(self)
                if data is None:
                    return
                try:
                    payload = json.loads(data.decode('utf-8'))
                except Exception:
                    send_json(self, {'status': 'erro', 'msg': 'JSON inválido'}, 400)
                    return
                db = load_db()
                items = db['items']
                pid = payload.get('publicId')
                if pid:
                    item = next((x for x in items if x['id'] == pid), None)
                    if not item:
                        send_json(self, {'status': 'erro', 'msg': 'Não encontrado'}, 404)
                        return
                else:
                    pid = 'pub_' + uuid.uuid4().hex[:10]
                    item = {'id': pid}
                    items.append(item)
                item['titulo'] = String(payload.get('titulo', 'Sem título'))[:80]
                item['autor'] = String(payload.get('autor', 'Anónimo'))[:40]
                item['thumb'] = String(payload.get('thumb', ''))
                item['atualizado'] = now_iso()
                item['projeto'] = payload.get('projeto', {})
                save_db(db)
                send_json(self, {'status': 'ok', 'id': pid})
                return
            if method == 'OPTIONS':
                self.send_response(204)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                return
            self.send_error(405)
            return

        m = re.match(r'^/api/public/([A-Za-z0-9_.-]+)$', path)
        if m:
            pid = m.group(1)
            if method == 'GET':
                db = load_db()
                item = next((x for x in db['items'] if x['id'] == pid), None)
                if not item:
                    send_json(self, {'status': 'erro', 'msg': 'Não encontrado'}, 404)
                    return
                send_json(self, {'status': 'ok', 'collage': item})
                return
            if method == 'DELETE':
                db = load_db()
                before = len(db['items'])
                db['items'] = [x for x in db['items'] if x['id'] != pid]
                save_db(db)
                send_json(self, {'status': 'ok', 'removed': len(db['items']) < before})
                return
            if method == 'OPTIONS':
                self.send_response(204)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                return
            self.send_error(405)
            return

        self.send_error(404)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._api('GET')
        else:
            self._send_static(self.path)

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._api('POST')
        else:
            self.send_error(405)

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self._api('PUT')
        else:
            self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self._api('DELETE')
        else:
            self.send_error(405)

    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            self._api('OPTIONS')
        else:
            self.send_response(204)
            self.end_headers()


def String(v):
    return str(v or '').strip()


if __name__ == '__main__':
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(PUBLIC_DB):
        save_db({'items': []})
    print('PinSpace Create — http://127.0.0.1:%d  (públicos em %s)' % (PORT, PUBLIC_DB))
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()