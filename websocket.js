var http = require('http'),
	WebSocketServer = require("ws").Server,
    shortid = require('shortid');

var app = require('./app')
var httpServer = http.createServer();
var wsServer = new WebSocketServer({server: httpServer})
httpServer.on('request', app);


var clients = {}

wsServer.on("connection", function(websocket) {
    var connection_id = shortid.generate();
    clients[connection_id] = websocket;
    websocket.connection_id = connection_id;
    console.log("websocket connection open %s", connection_id);
    var result = {'connection_id': connection_id}
    websocket.send(JSON.stringify(result), function() {  })
    websocket.on('message', function incoming(message) {
        console.log('received: %s', message);
        if(message=="ping")
            return;        	
    });
    websocket.on("close", function() {
        delete clients[websocket.connection_id];
        console.log("websocket connection closed ::", Object.keys(clients));            
    });
});
