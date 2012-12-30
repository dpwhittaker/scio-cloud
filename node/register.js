

module.exports = function (app) {
	this.get = function(req,res,next){
		res.render('register');
	};
	
	this.post = function(req,res,next){
		var Users = app.get('Users');
		var Schools = app.get('Schools');
		var user = {_id: req.body.username, password: req.body.password, first: req.body.firstname, last: req.body.lastname, userType: req.body.userType};
		var school = {name: req.body.name, system: req.body.system, state: req.body.state};
		//tasks = [async.apply(Users.insert, user, {w:1}), async.apply(req.login, user)];
		//if (user.userType == 'teacher') tasks.push(async.apply(Schools.update, school, {$push: {teachers: user._id}}, {upsert: true, w:1}));
		//async.series(tasks, function(err) { res.redirect('/' + user.userType); });
		Users.insert(user, {w:1},
			function(err, result) {
				if (err) return next(err);
				req.login(user, function(err) {
					if (err) return next(err);
					res.redirect('/' + user.userType);
				});
				if (user.userType == 'teacher')
					Schools.update(school, {$push: {teachers: user._id}}, {upsert: true, w:1},
						function (err, result) {
							if (err) return next(err);
						});
				else return next(err);
			});
	};
	
	return this;
}

