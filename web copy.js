var PORT = 12345;

var http = require('http');

var server = http.createServer(function(req, res) {
    if(req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });
        req.on('end', () => {
            console.log(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Received POST data', data: JSON.parse(body) }));
        });
    }
});
server.listen(PORT);