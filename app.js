var fs = require('fs');
var express = require('express');
var dummyjson = require('dummy-json');

var template = fs.readFileSync('template.hbs', {encoding: 'utf8'});
var app = express();

app.get('/', function(req, res) {
	res.send('<a href="./deed">deed.json</a>');
});

app.get('/deed', function(req, res) {
	res.attachment('deed.json')
	res.setHeader('Content-Type', 'application/octet-stream')
	res.end(dummyjson.parse(template));
});

app.listen(process.env.PORT || 3000);
