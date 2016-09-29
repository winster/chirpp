var http = require('http'),
	WebSocketServer = require("ws").Server,
    shortid = require('shortid'),
    account = require('./account'),
    jwt = require('jsonwebtoken'),
    secret = require('./secret.json');


var app = require('./app')
var httpServer = http.createServer();
var wsServer = new WebSocketServer({
    server: httpServer,
    verifyClient: function (info, cb) {
        var token = info.req.headers.token
        console.log('inside verifyClient')
        if (!token)
            cb(false, 401, 'Unauthorized')
        else {
            jwt.verify(token, secret.key, function (err, decoded) {
                if (err) {
                    cb(false, 401, 'Unauthorized')
                } else {
                    info.req.user = decoded //[1]
                    cb(true)
                }
            })

        }
    }
});
httpServer.on('request', app);

console.log('inside websocket')

var clients = {}

wsServer.on("connection", function(websocket) {
    var user = websocket.upgradeReq.user
    console.log(user.mobile)
    var connection_id = shortid.generate();
    clients[connection_id] = websocket;
    websocket.connection_id = connection_id;
    console.log("websocket connection open %s", connection_id);
    var result = {'connection_id': connection_id}
    websocket.send(JSON.stringify(result), function() {  })
    websocket.on('message', function incoming(message) {
        console.log('received: %s', message);
        console.log(this);
        if(message=="ping")
            return;

    });
    websocket.on("close", function() {
        delete clients[websocket.connection_id];
        console.log("websocket connection closed ::", Object.keys(clients));            
    });
});

exports = module.exports = httpServer;

