var fs = require('fs');
var express = require('express');
var dummyjson = require('dummy-json');
var jsonlint = require("jsonlint");

var app = express();

var models = ['deed', 'user'];

var domains = ['com', 'net', 'org', 'gov', 'qc.ca'];

var random = function(low, high) {
	return Math.floor(Math.random() * (high - low) + low);
};

var helpers = {
	domain: function(options) {
		return domains[random(0,domains.length)];
	}
};

models.forEach(function(model) {
	app.get('/' + model, function(req, res) {
		var template = fs.readFileSync(model + '.hbs', {encoding: 'utf8'});
		res.attachment(model + '.json');
		res.setHeader('Content-Type', 'application/octet-stream');
		var json = dummyjson.parse(template, {helpers: helpers});
		jsonlint.parse(json);
		res.end(json);
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
