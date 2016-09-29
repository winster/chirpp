var http = require('http'),
	WebSocketServer = require("ws").Server,
    shortid = require('shortid'),
    account = require('./account'),
    jwt = require('jsonwebtoken'),
    secret = require('./secret.json');

const debug = require('debug')('chirpp');

var app = require('./app')
var httpServer = http.createServer();
var wsServer = new WebSocketServer({
    server: httpServer,
    verifyClient: function (info, cb) {
        var token = info.req.headers.token
        debug('inside verifyClient')
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
    var connectionId = shortid.generate();
    clients[connectionId] = websocket;
    websocket.connectionId = connectionId;
    websocket.accountId = user.mobile;
    debug("websocket connection open %s", connectionId);
    //var result = {'connection_id': connection_id}
    var result = {'result': 'success'};
    websocket.send(JSON.stringify(result), function() {  })
    websocket.on('message', function incoming(message) {
        debug('received: %s', message);
        if(message=="ping") {
            account.ping(this.accountId);    
        } else {
            
        }
    });
    websocket.on("close", function() {
        delete clients[websocket.connectionId];
        debug("websocket connection closed ::", Object.keys(clients));            
    });
});

exports = module.exports = httpServer;

