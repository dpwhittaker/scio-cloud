var async = require('async');
var app;

exports.init = function (appVar) {
	app = appVar;
	app.get('/register', get);
	app.post('/register', post);
	app.get('/schools', schools);
}

function get(req,res,next){
	res.render('register');
};

function post(req,res,next){
	var Users = app.get('Users');
	var Schools = app.get('Schools');
	var user = {_id: req.body.username, password: req.body.password, first: req.body.firstname, last: req.body.lastname, userType: req.body.userType};
	var school = {name: req.body.school, system: req.body.system, state: req.body.state};

	async.auto({
		insertUser: function (callback) {
			Users.insert(user, {w:1}, callback);
		},
		updateSchool: function (callback) {
			if (user.userType != 'teacher') return callback();
			Schools.update(school, {$addToSet: {teachers: user._id}}, {upsert: true, w:1}, callback);
		},
		login: ['insertUser', 'updateSchool', function (callback) {
			req.login(user, callback); 
		}],
		redirect: ['login', function (callback) {
			res.redirect('/' + user.userType); callback();
		}]
	}, function(err, results) {
		if (err) next(err);
	});
};

function schools(req,res,next){
	var Schools = app.get('Schools');
	Schools.find({'name': {$regex: req.params.term, $options: 'i'} }).toArray(function(array){
		res.send(array);
	});
};

