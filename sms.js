var https = require("https"),
    request = require("request"),
    Q = require("q"),
    smtpTransport = require('nodemailer-smtp-transport');

const debug = require('debug')('chirpp');

var Sms = function(){};

Sms.prototype.send = function(account) {
    debug('Send:'+JSON.stringify(account), 'SMS');
    var d = Q.defer();
    var data = "username=wtjose@gmail.com&hash=8be293b97b1f2e41adbf4c2257882fe024354f85"+
               "&message="+account.otp+" is OTP to register with Chirpee"+
               "&sender=TXTLCL&numbers="+account.mobile+"&test=true";

    /*request('https://api.textlocal.in/send?'+data, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            d.resolve(JSON.parse(body));
        } else {
            d.reject(error);
        }
    });*/
    d.resolve({});
    return d.promise;
};

Sms.prototype.invite = function(to, from) {
    debug('SMS:Invite: to %s , from %s', to, from);
    var d = Q.defer();
    var data = "username=wtjose@gmail.com&hash=8be293b97b1f2e41adbf4c2257882fe024354f85"+
               "&message="+from+" has invited you to Chirpee. Download from http://www.google.com"+
               "&sender=TXTLCL&numbers="+to+"&test=true";

    /*request('https://api.textlocal.in/send?'+data, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            d.resolve(JSON.parse(body));
        } else {
            d.reject(error);
        }
    });*/
    d.resolve({});
    return d.promise;
};

exports = module.exports = new Sms();

