var ObjectID = require('mongodb').ObjectID;
var Binary = require('mongodb').Binary;
var fs = require('fs');
var crypto = require('crypto');
var app;

exports.init = function (appVar) {
	app = appVar;
	app.all('/teacher*', authorize);
	app.get('/teacher', get);
	app.get('/teacher/questions', questions);
	app.get('/teacher/questions/new', newQuestion);
	app.get('/teacher/questions/:id', viewQuestion);
	app.get('/teacher/questions/:id/edit', editQuestion);
	app.get('/teacher/questions/:id/delete', deleteQuestion);
	app.post('/teacher/questions/:id/img/new', newImage);
	app.get('/teacher/questions/:id/img/browse', browseImages);
	app.get('/teacher/questions/:id/img/:img', getImage);
	app.get('/teacher/questions/:id/img/:img/delete', deleteImage);
}

function authorize (req, res, next) {
	if (!req.user) return res.redirect('/login');
	if (req.user.userType != 'teacher') return res.redirect('/' + req.user.userType);
	res.locals.user = req.user;
	next();
};

function get (req, res, next) {
	res.render('teacher');
};

function questions (req, res, next) {
	app.get('Questions').find({author: req.user._id}).toArray(function(err, questions) {
		if (err) next(err);
		res.render('questions', {questions: questions});
	});
}

function viewQuestion (req, res, next) {
	app.get('Questions').findOne({_id: new ObjectID(req.params.id)}, function (err, question) {
		if (err) return next(err);
		if (!question) return res.send('Question not found');
		res.render('viewQuestion', {question: question});
	});
}

function newQuestion (req, res, next) {
	app.get('Questions').insert({
		title: 'Untitled',
		body: '',
		author: req.user._id,
		variables: {},
		answers: {},
		images: {},
		imageHashes: []
	}, {w:1}, function (err, question) {
		if (err) return next(err);
		res.redirect('/teacher/questions/' + question[0]._id + '/edit');
	});
}

function editQuestion (req, res, next) {
	app.get('Questions').findOne({_id: new ObjectID(req.params.id)}, function (err, question) {
		if (err) return next(err);
		if (!question) return res.send('Question not found');
		res.render('editQuestion', {question: question});
	});
}

function deleteQuestion (req, res, next) {
	app.get('Questions').remove({_id: new ObjectID(req.params.id)}, {w:1}, function(err) {
		if (err) return next(err);
		res.redirect('/teacher/questions');
	});
}

function newImage (req, res, next) {
	var type = req.files.image.type;
	fs.readFile(req.files.image.path, function (err, data) {
		var hash = crypto.createHash('md5');
		hash.update(data);
		hash = hash.digest('base64').replace(/=/g, '').replace(/[/+]/g, '_');
		var update = {$addToSet: {imageHashes: hash}, $set: {}};
		update.$set['images.' + hash] = {type: type, data: new Binary(data)};
		console.log(update);
		app.get('Questions').update(
			{_id: new ObjectID(req.params.id)},
			update,
			{w:1},
			function(err) {
				if (err) return next(err);
				res.send(hash);
			});
	});
}

function getImage (req, res, next) {
	var hash = req.params.img;
	var projection = {};
	projection['images.' + hash] = 1;
	app.get('Questions').findOne({_id: new ObjectID(req.params.id)}, projection,
		function(err, data) {
			if (err) return next(err);
			console.log(data);
			var image = data.images[hash];
			res.set('Content-Type', image.type);
			res.send(image.data.buffer);
		});

}

function browseImages (req, res, next) {
	app.get('Questions').findOne({_id: new ObjectID(req.params.id)}, {imageHashes: 1},
		function(err, data) {
			if (err) return next(err);
			res.render('browseImages', {question: req.params.id, images: data.imageHashes});
		});
}

function deleteImage (req, res, next) {
	var hash = req.params.img;
	var update = {$pull: {imageHashes: hash}, $unset : {}};
	update.$unset['images.' + hash] = 1;
	console.log(update);
	app.get('Questions').update(
		{_id: new ObjectID(req.params.id)},
		update,
		{w:1},
		function(err) {
			if (err) return next(err);
			res.send('success');
		});
}
