var GCM = require('node-gcm-ccs');

var gcm = GCM('103830185013', 'AIzaSyAi9mBNTqpdhgeTJOHpVT90r5aBTNobYwQ');


gcm.on('message', function(messageId, from, category, data) {
    console.log('upstream message received::'+JSON.stringify(data))
    //Using Websocket instead of this event
});
 
gcm.on('receipt', function(messageId, from, category, data) {
    console.log('Receipt::GCM delivered the message', arguments);
});

gcm.on('connected', function(){console.log('connected')});
gcm.on('disconnected', function(){console.log('disconnected')});
gcm.on('online', function(){console.log('online')});
gcm.on('error', function(){console.log('error')});
gcm.on('message-error', function(message){console.log('message-error::', message)});

var send = function(token, payload, errorCallback){
	gcm.send(token, payload, { delivery_receipt_requested: true }, (err, messageId, to) => {
        if (err) {
        	errorCallback(to, messageId, err);    
        }
    })	
}

exports = module.exports = send;