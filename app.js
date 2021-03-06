(function(){
	"use strict";

	var _ = require('underscore');
	var fs = require('fs');
	var express = require('express');
	var dummyjson = require('dummy-json');
	var jsonlint = require("jsonlint");
	var randomstring = require("randomstring");
	var bcrypt = require('bcrypt');
	var Kaiseki = require('kaiseki');
	var async = require('async');
	var im = require('imagemagick');
	var kaiseki;

	//SETUP
	var app = express();
	try {
		_.extend(process.env, require('./config'));
	} catch (err) {
		console.log('error on config', err);
	}

	//GLOBAL VARS
	var salt = "";
	var models = ['deed', 'user'];
	var domains = ['com', 'net', 'org', 'gov', 'qc.ca'];
	var all_users;

	//HELPERS
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
	};
	Array.prototype.random = function() {
		return this[_.random(this.length-1)];
	};
	var randomColor = function() {
		var color = '';
		for(var i=0; i<3; i++) {
			var char = _.random(255).toString(16);
			if(char.length===1) char = '0' + char;
			color += char;
		}
		return color;
	};
	var helpers = {
		domain: function() {
			return domains.random();
		},
		token: function() {
			return randomstring.generate();
		},
		password: function(){
			return bcrypt.hashSync(randomstring.generate(), salt);
		}
	};

	var generate = function(model, next) {
		var parseTemplate = function() {
			var template = fs.readFileSync(model + '.hbs', {encoding: 'utf8'});
			var json = dummyjson.parse(template, {helpers: helpers});
			jsonlint.parse(json);
			json = JSON.parse(json);

			var iterateResults = function(i, nextResult) {
				generateAvatar(function(err, data) {
					if(err) {
						console.log('err!', data);
						nextResult();
					}
					kaiseki.uploadFileBuffer(new Buffer(data, "binary"), 'image/png', 'cat' + i,
					function(err, res, body, success) {
						if(err) return console.log('error on uploadFile', err);
						if(!success) return console.log('no success on uploadFile', body);
						json.results[i].media.name = body.name;
						json.results[i].media.url = body.url;
						nextResult();
					});

				});
			};

			async.each(_.range(json.results.length), iterateResults, function(err){
				if(err) return console.log(err);
				next(json);
			});
		};

		parseTemplate();
	};

	//ROUTES

	models.forEach(function(model) {
		app.get('/' + model, function(req, res) {
			var sendJSON = function(json) {
				res.setHeader('Content-Type', 'application/octet-stream');
				res.attachment(model + '.json');
				res.send(json);
			};
			generate(model, sendJSON);
		});
		app.get('/' + model + '/api', function(req, res) {
			var json;
			var max = process.env.PARSE_COMMANDS_MAX;

			var assignJSON = function(_json) {
				json = _json.results;
				createObjects(capitalize(model), json, finished);
			};

			var createObjectsInParse = function(model, json, next) {
				if(model==='User') {
					// model is User
					async.each(json, function(userInfo, nextUser) {
						delete userInfo.bcryptPassword;
						userInfo.password = randomstring.generate();
						kaiseki.createUser(userInfo, function(err, res, body, success) {
							if(err) return console.log('error on createUser', err);
							if(!success) return console.log('no success on createUser', body);
							nextUser();
						});
					}, function(err) {
						next(err, res, null, true);
					});
				} else {
					// model is Deed or others
					async.each(json, function(object, nextObject) {
						var user_objectId = all_users.random().objectId;
						object.user = { __type: 'Pointer', className: '_User', objectId: user_objectId };
						kaiseki.createObject(model, object, function(err, res, body, success) {
							if(err) return console.log('error on createObject', err);
							if(!success) return console.log('no success on createObject', body);
							kaiseki.updateUser(user_objectId, {
								"deeds": {
									"__op": "AddRelation",
									"objects": [
									{
										"__type": "Pointer",
										"className": "Deed",
										"objectId": body.objectId
									}
									]
								}
							}, function(err, res, body, success) {
								if(err) return console.log('error on updateUser', err);
								if(!success) return console.log('no success on updateUser', body);
								nextObject();
							});
						});
					}, function(err) {
						next(err, res, null, true);
					});
				}
			};

			var createObjects = function(model, json, next) {
				if(json.length > max) {
					createObjectsInParse(model, json.slice(0,max), function(err, response, body, success) {
						if(err) return console.log('error on createObject', err);
						if(!success) return console.log('no success on createObject', body);
						createObjects(model, json.slice(max), next);
					});
				} else {
					createObjectsInParse(model, json, next);
				}
			};

			var finished = function(err, response, body, success) {
				if(err) return console.log('error on finished', err);
				if(!success) return console.log('no success on finished', err, response, body, success);
				res.redirect('/');
			};

			generate(model, assignJSON);

		});
	});

	var generateAvatar = function(next) {
		var svg = fs.readFileSync('images/circle.svg', 'utf8');
		svg = svg.replace(/{{fill}}/g, '#' + randomColor());
		svg = svg.replace(/{{head_width}}/g, _.random(30,50));
		svg = svg.replace(/{{head_height}}/g, _.random(30,50));
		svg = svg.replace(/{{body_width}}/g, _.random(40,60));
		svg = svg.replace(/{{body_height}}/g, _.random(40,60));
		var conv = im.convert(['-background', 'none', 'svg:-', 'png:-'], next);
		conv.stdin.write(svg);
		conv.stdin.end();
	};

	app.get('/', function(req, res) {
		var html = '<ul>';
		models.forEach(function(model) {
			html += '<li><a href="./' + model + '">' + model + '.json</a> ';
			html += '<a href="/' + model + '/api">add through API</a></li>';
		});
		html += '</ul>';
		res.send(html);
	});

	app.get('/avatar', function(req, res) {
		generateAvatar(function(err, stdout) {
			if(err) console.log('error on generateAvatar !', err);
			res.writeHead(200, {'Content-Type': 'image/png' });
			res.end(stdout, 'binary');
		});
	});

	//INIT

	function initApp() {
		kaiseki = new Kaiseki(process.env.PARSE_APP_ID, process.env.PARSE_REST_API_KEY);
		kaiseki.masterKey = process.env.PARSE_MASTER_KEY;
		kaiseki.getUsers(function(err, res, body, success) {
			all_users = body;
			if(success) {
				app.listen(process.env.PORT || 3000);
			}

		});
	}

	bcrypt.genSalt(10, function(err, _salt) {
		salt = _salt;
		initApp();
	});

})();
