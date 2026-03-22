const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/progress/analytics',
  method: 'GET',
  headers: {
    // We need a Bearer token. I will just query prisma directly to bypass Auth.
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
req.end();
