const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = req.url;
  
  // Default to dashboard.html for root
  if (filePath === '/') {
    filePath = '/dashboard.html';
  }
  
  // Remove query string
  filePath = filePath.split('?')[0];

  // Support requests to /frontend by redirecting to the dashboard
  if (filePath.startsWith('/frontend')) {
    const remainder = filePath.replace(/^\/frontend/, '') || '/';
    if (remainder === '/' || remainder === '') {
      filePath = '/dashboard.html';
    } else {
      filePath = remainder;
    }
  }
  
  // Build full file path
  let fullPath = path.join(__dirname, filePath);
  
  // If requested path has no extension, try adding .html
  let ext = path.extname(fullPath).toLowerCase();
  if (!ext) {
    const tryHtml = fullPath + '.html';
    if (fs.existsSync(tryHtml)) {
      fullPath = tryHtml;
      ext = '.html';
    }
  }
  
  // Map extensions to MIME types
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif'
  };
  
  // Read and serve the file
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.log('404 - File not found:', fullPath);
      res.writeHead(404, {'Content-Type': 'text/html'});
      res.end('<h1>404 - Not Found</h1><p>File: ' + fullPath + '</p>');
      return;
    }
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type': contentType});
    res.end(data);
    console.log('200 - Served:', filePath);
  });
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Serving from: ${__dirname}`);
});
