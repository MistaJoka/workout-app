#!/usr/bin/env python3
"""Static file server for the self-hosted PWA (see scripts/selfhost.sh).

Binds to 127.0.0.1 only; Tailscale Funnel provides the public HTTPS front.
Usage: selfhost-server.py <site-dir> [port]
"""
import functools
import http.server
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
