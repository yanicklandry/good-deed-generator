var fs = require('fs');
var express = require('express');
var dummyjson = require('dummy-json');

var app = express();

var models = ['deed'];

models.forEach(function(model) {
	app.get('/' + model, function(req, res) {
		var template = fs.readFileSync(model + '.hbs', {encoding: 'utf8'});
		res.attachment(model + '.json')
		res.setHeader('Content-Type', 'application/octet-stream')
		res.end(dummyjson.parse(template));
	});
});

app.get('/', function(req, res) {
	var html = '<ul>'
	models.forEach(function(model) {
		html += '<li><a href="./' + model + '">' + model + '.json</a></li>';
	});
	html += '</ul>';
	res.send(html);
});

app.listen(process.env.PORT || 3000);
