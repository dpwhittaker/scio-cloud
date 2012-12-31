var ObjectID = require('mongodb').ObjectID;
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
		images: []
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
