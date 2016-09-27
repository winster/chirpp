var express = require('express'),
    bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function() {
  console.log('App is running on port', app.get('port'));
});
exports = module.exports = app;

require("./router");
require("./websocket");
require("./gcm");