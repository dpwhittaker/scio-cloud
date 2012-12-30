var app;

exports.init = function (appVar) { app = appVar; return exports; }

exports.authorize = function (req, res, next) {
	console.log('Authorizing:');
	console.log(req.user);
	if (!req.user) return res.redirect('/login');
	if (req.user.userType != 'teacher') return res.redirect('/' + req.user.userType);
	next();
};

exports.get = function (req,res,next) {
	res.render('teacher', {user: req.user});
};

