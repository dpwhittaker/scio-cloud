var app;

exports.init = function (appVar) { app = appVar; return exports; }

exports.schools = function(req,res,next){
	var Schools = app.get('Schools');
	Schools.find({'name': {$regex: req.params.term, $options: 'i'} }).toArray(function(array){
		res.send(array);
	});
};

