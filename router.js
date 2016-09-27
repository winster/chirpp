var app = require('./app');

app.get('/otp', function(req, res) {
	res.json({'status':'success'});
});