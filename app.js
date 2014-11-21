var fs = require('fs');
var express = require('express');
var dummyjson = require('dummy-json');

var template = fs.readFileSync('template.hbs', {encoding: 'utf8'});
var app = express();

app.get('/deed', function(req, res) {
	// res.set('Content-Type', 'application/json');
	// res.send(dummyjson.parse(template));

	res.attachment('deed.json')
	//following line is not necessary, just experimenting
	res.setHeader('Content-Type', 'application/octet-stream')

	res.setHeader('Content-Type', 'application/json');
	res.end(dummyjson.parse(template));
});

app.listen(process.env.PORT || 3000);
