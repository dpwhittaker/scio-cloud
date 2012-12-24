var express = require('express')
  , engine = require('ejs-locals')
  , mongo = require('mongodb')
  , async = require('async')
  , connectMongoDb = require('connect-mongodb')
  , app = express()
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

app.set('secret', '53cr3t5 R h4rd 2 k33p!');

app.configure('development', function() {
	app.set('mongoUrl', 'mongodb://127.0.0.1:27017/scio-mongodb');
	app.set('host', 'localhost');
	app.set('port', 3000);
	app.set('googleReturnUrl', 'http://localhost:3000/auth');
	app.set('googleRealm', 'http://localhost:3000');
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
	app.set('googleReturnUrl', 'http://scio.beyondthegradebook.com/auth');
	app.set('googleRealm', 'http://beyondthegradebook.com');
});

async.series([setupDb, setupApp, listen]);

function setupDb(callback) {
  mongo.connect(app.get('mongoUrl'), function(err, db) {
    if (err) { callback(err); return; }
		app.set('db', db);
		async.forEach(['Users'],
			function (collectionName, next) {
				db.createCollection(collectionName, function(err, collection) {
					if (err) { next(err); return; }
					app.set(collectionName, collection);
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

	passport.use(new LocalStrategy(authenticate));

	app.use('/static', express.static(__dirname + '/static'));

	app.get('/',function(req,res,next){ res.render('index'); });
	
	var auth = passport.authenticate('local', {failureRedirect: '/login'});
	app.post('/login', auth, function(req,res,next) {res.redirect('/' + req.session.userType);});
	app.get('/login', function(req,res,next){ res.render('login'); });

	app.get('/register', function(req,res,next){ res.render('register'); });
	callback();
}

function listen(callback) {
	app.listen(app.get('port'));
	callback();
}

function authenticate(username, password, done) {
	var Users = app.get('Users');
  Users.findOne({ username: username }, function(err, user) {
    if (err) { return done(err); }
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    if (!user.password == password) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  });
}

