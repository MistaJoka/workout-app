#!/usr/bin/env python3
"""Static file server for the self-hosted PWA (see scripts/selfhost.sh).

Binds to 127.0.0.1 only; Tailscale Funnel provides the public HTTPS front.
Usage: selfhost-server.py <site-dir> [port]
"""
import functools
import http.server
import os
import sys

TYPES = {
    ".webp": "image/webp",
    ".webmanifest": "application/manifest+json",
    ".json": "application/json",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".wasm": "application/wasm",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **TYPES}

    # selfhost.sh writes a .gz next to every text file at publish time. When
    # the browser accepts gzip, send that instead (same type and caching),
    # which cuts the first install from ~1.6 MB to ~0.5 MB.
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path) and self.path.split("?", 1)[0].endswith("/"):
            path = os.path.join(path, "index.html")
        gz = path + ".gz"
        accepts = "gzip" in self.headers.get("Accept-Encoding", "")
        if accepts and os.path.isfile(path) and os.path.isfile(gz):
            try:
                f = open(gz, "rb")
            except OSError:
                return super().send_head()
            fs = os.fstat(f.fileno())
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(fs.st_size))
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            self.send_header("Vary", "Accept-Encoding")
            self.end_headers()
            return f
        return super().send_head()

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html", "/sw.js", "/manifest.json"):
            # The app shell and worker must revalidate so updates reach the phone.
            self.send_header("Cache-Control", "no-cache")
        elif path.startswith("/assets/"):
            # Vite content-hashed files never change.
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        if path == "/sw.js":
            self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()

    def log_message(self, fmt, *args):  # quiet: journald gets errors only
        pass


def main():
    site = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8795
    handler = functools.partial(Handler, directory=site)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as srv:
        srv.serve_forever()


if __name__ == "__main__":
    main()
