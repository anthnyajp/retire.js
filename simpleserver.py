import sys
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

# Determine Python version
PYTHON_VERSION = sys.version_info[0]

# Set port
PORT = 8000 if len(sys.argv) < 2 else int(sys.argv[1])

# Change directory to 'repository'
os.chdir('repository')

# Start server
server = HTTPServer(('0.0.0.0', PORT), SimpleHTTPRequestHandler)

print(f"Serving on port {PORT}")
server.serve_forever()
