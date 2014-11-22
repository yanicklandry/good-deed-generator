var _ = require('underscore');
var fs = require('fs');
var express = require('express');
var dummyjson = require('dummy-json');
var jsonlint = require("jsonlint");
var randomstring = require("randomstring");
var bcrypt = require('bcrypt');
var Kaiseki = require('kaiseki');
var kaiseki;

var app = express();

try {
	_.extend(process.env, require('./config'));
} catch (err) {
	console.log('error', err)
}

var salt = "";

var models = ['deed', 'user'];

var domains = ['com', 'net', 'org', 'gov', 'qc.ca'];

//HELPERS
var random = function(low, high) {
	return Math.floor(Math.random() * (high - low) + low);
};
var capitalize = function(s)
{
	return s && s[0].toUpperCase() + s.slice(1);
};
Array.prototype.chunk = function(chunkSize) {
	var array=this;
	return [].concat.apply([],
		array.map(function(elem,i) {
			return i%chunkSize ? [] : [array.slice(i,i+chunkSize)];
		})
	);
}

var helpers = {
	domain: function(options) {
		return domains[random(0,domains.length)];
	},
	token: function() {
		return randomstring.generate();
	},
	password: function(){
		return bcrypt.hashSync(randomstring.generate(), salt);
	}
};

var generate = function(model) {
	var template = fs.readFileSync(model + '.hbs', {encoding: 'utf8'});
	var json = dummyjson.parse(template, {helpers: helpers});
	jsonlint.parse(json);
	return(json);
};


models.forEach(function(model) {
	app.get('/' + model, function(req, res) {
		res.setHeader('Content-Type', 'application/octet-stream');
		res.attachment(model + '.json');
		res.end(generate(model));
	});
	app.get('/' + model + '/api', function(req, res) {
		var json = JSON.parse(generate(model)).results;
		var max = process.env.PARSE_COMMANDS_MAX;
		var createObjects = function(model, json, next) {
			if(json.length > max) {
				kaiseki.createObjects(model, json.slice(0,max), function(err) {
					if(err) return console.log(err);
					createObjects(model, json.slice(max), next);
				});
			} else {
				kaiseki.createObjects(model, json, next);
			}
		}
		var finished = function(err, response, body, success) {
			if(err) return console.log(err);
			res.redirect('/');
		};
		createObjects(capitalize(model), json, finished);
	});
});

app.get('/', function(req, res) {
	var html = '<ul>'
	models.forEach(function(model) {
		html += '<li><a href="./' + model + '">' + model + '.json</a> ';
		if(model!=='user')
			html += '<a href="/' + model + '/api">add through API</a></li>';
	});
	html += '</ul>';
	res.send(html);
});

bcrypt.genSalt(10, function(err, _salt) {
	salt = _salt;
	initApp();
});

function initApp() {
	kaiseki = new Kaiseki(process.env.PARSE_APP_ID, process.env.PARSE_REST_API_KEY);
	app.listen(process.env.PORT || 3000);
}
