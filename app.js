var express = require('express')
  , engine = require('ejs-locals')
  , flash = require('connect-flash')
  , mongo = require('mongodb')
  , async = require('async')
  , connectMongoDb = require('connect-mongodb')
  , app = express()
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , register = require('./node/register.js')(app);

app.configure('development', function() {
	//af tunnel scio-mongodb
	//app.set('mongoUrl', 'mongodb://f929dc4f-3f05-439e-aa35-4fa4390d5635:2b35906a-f6ac-4b0e-b85f-d8544a7f513c@localhost:10000/db');
	app.set('mongoUrl', 'mongodb://localhost/scio-mongodb');
	app.set('host', 'localhost');
	app.set('port', 3000);
	app.set('secret', '53cr3t5 R h4rd 2 k33p!');
});

app.configure('production', function() {
	var env = JSON.parse(process.env.VCAP_SERVICES);
	var obj = env['mongodb-1.8'][0]['credentials'];
	obj.hostname = (obj.hostname || 'localhost');
	obj.port = (obj.port || 27017);
	obj.db = (obj.db || 'test');
	if(obj.username && obj.password)
		app.set('mongoUrl', "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db);
	else
		app.set('mongoUrl', "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db);
	app.set('port', process.env.VCAP_APP_PORT || 3000);
	app.set('host', process.env.VCAP_APP_HOST || 'localhost');
	app.set('secret', process.env.SECRET);
});

async.series([setupDb, setupApp, listen]);

function setupDb(callback) {
  mongo.connect(app.get('mongoUrl'), function(err, db) {
    if (err) { console.log(err); callback(err); return; }
		app.set('db', db);
		async.forEach(['Users','Schools'],
			function (collectionName, next) {
				db.createCollection(collectionName, function(err, collection) {
					if (err) { console.log(err); next(err); return; }
					app.set(collectionName, collection);
					if (collectionName == 'Schools') {
						collection.ensureIndex({name: 1, system: 1, state: 1}, {unique: true});
					}
					next();
				});
			}, callback);
  });
}

function setupApp(callback) {
	app.engine('ejs', engine);

	app.set('views',__dirname + '/views');
	app.set('view engine', 'ejs');

	app.use(express.bodyParser());
	app.use(express.cookieParser());

	var mongoStore = new connectMongoDb({ db: app.get('db') });
	app.use(express.session({ secret: app.get('secret'), store: mongoStore }));
	
	app.use(flash());
	
	app.use(passport.initialize());
	app.use(passport.session());

	passport.use(new LocalStrategy(authenticate));
	passport.serializeUser(function(user, done) {
		done(null, user._id);
	});

	passport.deserializeUser(function(id, done) {
		app.get('Users').findOne({_id: id}, function(err, user) {
			done(err, user);
		});
	});

	app.use('/js', express.static(__dirname + '/js'));
	app.use('/css', express.static(__dirname + '/css'));

	app.get('/',function(req,res,next){ if (req.user) res.redirect('/' + req.user.userType); else res.render('index'); });
	
	var auth = passport.authenticate('local', {failureRedirect: '/login', failureFlash: true});
	app.post('/login', auth, function(req,res,next) {res.redirect('/' + req.user.userType);});
	app.get('/login', function(req,res,next){ res.render('login', {error: req.flash('error')} ); });

	app.get('/register', register.get);
	app.post('/register', register.post);
	
	var Schools = app.get('Schools');
	app.get('/schools', function(req,res,next){
		Schools.find({'name': {$regex: req.params.term, $options: 'i'} }).toArray(function(array){
			res.send(array);
		});
	});
	
	callback();
}

function listen(callback) {
	app.listen(app.get('port'));
	callback();
}

function authenticate(username, password, done) {
	app.get('Users').findOne({ _id: username }, function(err, user) {
    if (err) { return done(err); }
    if (!user || user.password != password) {
      return done(null, false, { message: 'Incorrect username or password.' });
    }
    return done(null, user);
  });
}

