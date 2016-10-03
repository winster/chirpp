var https = require("https"),
    Q = require("q"),
    smtpTransport = require('nodemailer-smtp-transport');

const debug = require('debug')('chirpp');

var Sms = function(){};

Sms.prototype.send = function(account) {
    debug('Send:'+JSON.stringify(account), 'SMS');
    var d = Q.defer();
    /*var mailOptions = {
        from: 'admin@chirpee.com',
        to: account.mobile,
        subject: 'OTP for Chirpee Login',
        text: 'Welcome to Chirpee',
        html: '<span>Your OTP <b>'+account.otp+'</b>'
    };
    var postOptions = {
        host: 'winmail.herokuapp.com',
        port: '443',
        path: '/mail',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    var req = https.request(postOptions, function(res) {
        var result = '';
        res.on('data', function (chunk) {
            result += chunk;
        });
        res.on('end', function () {
            debug('Heroku Mail:'+result, 'SMS');
            d.resolve({"result":"success"});
        });
        res.on('error', function (err) {
            console.log(err);
            d.reject({'error':'Heroku Mail Error','errorCode':'SMS101'});
        });        
    });
    req.write(JSON.stringify(mailOptions));
    req.end();*/
    d.resolve({"result":"success"});    
    return d.promise;
};

Sms.prototype.invite = function(to, from) {
    debug('SMS:Invite: to %s , from %s', to, from);
    var d = Q.defer();
    /*var mailOptions = {
        from: 'admin@chirpee.com',
        to: to,
        subject: 'Welcome to Chirpee ',
        text: 'Welcome to Chirpee',
        html: '<span>Your friend '+ from +' has invited you to join Chirpee'
    };
    var postOptions = {
        host: 'winmail.herokuapp.com',
        port: '443',
        path: '/mail',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    var req = https.request(postOptions, function(res) {
        var result = '';
        res.on('data', function (chunk) {
            result += chunk;
        });
        res.on('end', function () {
            debug('Heroku Mail:'+result, 'SMS');
            d.resolve({"result":"success"});
        });
        res.on('error', function (err) {
            console.log(err);
            d.reject({'error':'Heroku Mail Error','errorCode':'SMS101'});
        });        
    });
    req.write(JSON.stringify(mailOptions));
    req.end();*/
    d.resolve({"result":"success"});
    return d.promise;
};

exports = module.exports = new Sms();

