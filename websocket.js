var http = require('http'),
	WebSocketServer = require("ws").Server,
    shortid = require('shortid'),
    jwt = require('jsonwebtoken'),
    Account = require('./account'),
    AccountProductContact = require('./accountProductContact'),
    MessageHistory = require('./messageHistory'),
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
    Account.updateSocketId(user.mobile, socketId)
    .then(function(res){debug("successfully updated socketId %s", JSON.stringify(res))})
    .catch(function(err){debug("error in updating socketId %s", JSON.stringify(err))});
    websocket.send('success', function() {  })
    websocket.on('message', function incoming(message) {
        debug('received: %s', message);
        var accountId = this.accountId;
        if(message=="P") {
            Account.ping(accountId)
            .then(AccountProductContact.ping);
        } else {
            var json = JSON.parse(message);
            Account.isOnline(json.cid).then(function(response){
                debug("Account isOnline: %s", response.isOnline);
                if(response.isOnline && clients[response.socketId]) {
                    debug("Sending message via websocket");
                    json.cid=accountId;
                    clients[response.socketId].send(JSON.stringify(json), function(){});
                } else {
                    json.aid = json.cid;
                    json.cid = accountId;
                    MessageHistory.save(json)
                    .then(function(res){
                        debug("Sending message via gcm");
                        gcm(response.deviceToken, message, function(error){
                            //handle gcm error callbacks
                        });
                    }).catch(function(err){
                        debug("MessageHistory.save failed %s", err);
                    });
                }
            });
        }
    });
    websocket.on("close", function() {
        delete clients[websocket.socketId];
        debug("websocket connection closed ::", Object.keys(clients));            
    });
});

var wsSend = function(accountId, isOnline, socketId, deviceToken, message) {
    debug("Websocket:send message %s %s %s %s", isOnline, socketId, deviceToken, JSON.stringify(message));
    if(isOnline && clients[socketId]) {
        debug("Websocket Client available")
        clients[socketId].send(JSON.stringify(message), function(){});
    }  else {
        debug("Websocket Client not available and using GCM")
        if(message.t!='contact'){
            message.aid = accountId;
            MessageHistory.save(message)
            .then(function(res){
                gcm(response.deviceToken, message, function(error){
                    //handle gcm error callbacks
                });
            }).catch(function(err){
                debug("MessageHistory.save failed %s", err);
            });
        } else {
            gcm(response.deviceToken, message, function(error){
                //handle gcm error callbacks
            });
        }
    }
}

exports = module.exports = {server:httpServer,send:wsSend};

