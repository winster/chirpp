var http = require('http'),
	WebSocketServer = require("ws").Server,
    shortid = require('shortid'),
    jwt = require('jsonwebtoken'),
    account = require('./account'),
    gcm = require("./gcm"),
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

var clients = {}

wsServer.on("connection", function(websocket) {
    var user = websocket.upgradeReq.user
    var socketId = shortid.generate();
    clients[socketId] = websocket;
    websocket.socketId = socketId;
    websocket.accountId = user.mobile;
    debug("websocket connection open %s %s", user.mobile, socketId);
    //var result = {'connection_id': connection_id}
    var result = {'result': 'success'};
    websocket.send(JSON.stringify(result), function() {  })
    websocket.on('message', function incoming(message) {
        debug('received: %s', message);
        if(message=="ping") {
            account.ping(this.accountId);    
        } else {
            var json = JSON.parse(message);
            account.isOnline(json.contactId).then(function(response){
                json.contactId=this.accountId;
                if(response.isOnline && clients[response.socketId]) {
                    clients[response.socketId].send(JSON.stringify(json), function(){});
                } else {
                    /*gcm(response.deviceToken, message, function(error){
                        //handle gcm error callbacks
                    });*/
                }
            });
        }
    });
    websocket.on("close", function() {
        delete clients[websocket.socketId];
        debug("websocket connection closed ::", Object.keys(clients));            
    });
});

var send = function(isOnline, socketId, deviceToken, message) {
    debug("Websocket:send message %s %s %s %s", isOnline, socketId, deviceToken, message);
    if(isOnline && clients[socketId]) {
        clients[socketId].send(message, function(){});
    }  else {
        /*gcm(response.deviceToken, message, function(error){
            //handle gcm error callbacks
        });*/
    }
}

exports = module.exports = {server:httpServer,send:send};

