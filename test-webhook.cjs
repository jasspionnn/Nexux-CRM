const http = require('http');

const postData = JSON.stringify({ name: 'Novo Webhook', url: 'https://...', active: true });

const req = http.request('http://127.0.0.1:8787/api/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('Response:', res.statusCode, data); });
});

req.on('error', (err) => {
  console.log('Error:', err.message);
});

req.write(postData);
req.end();
