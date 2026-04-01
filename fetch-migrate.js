fetch('http://127.0.0.1:8787/api/migrate-db').then(r => r.text()).then(console.log).catch(console.error);
