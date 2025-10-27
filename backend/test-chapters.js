const http = require('http');

function testChaptersAPI() {
  console.log('Testing chapters API...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/chapters',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Chapters API response:', data);
    });
  });

  req.on('error', (error) => {
    console.error('Error testing chapters API:', error.message);
  });

  req.end();
}

testChaptersAPI();