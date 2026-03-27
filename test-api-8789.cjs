const http = require('http');

http.get('http://127.0.0.1:8789/api/funnels', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('Funnels:', data); });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
