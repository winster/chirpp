var https = require("https"),
    request = require("request"),
    Q = require("q"),
    smtpTransport = require('nodemailer-smtp-transport');

const debug = require('debug')('chirpp');

var Sms = function(){};

Sms.prototype.send = function(account) {
    debug('SMS:Send:'+JSON.stringify(account));
    var d = Q.defer();
    var data = "username=wtjose@gmail.com&hash=8be293b97b1f2e41adbf4c2257882fe024354f85"+
               "&message="+account.otp+" is the OTP to access your Chirpee account. Welcome to Chirpee!"+
               "&sender=CHIRPE&numbers="+account.mobile;

    request('https://api.textlocal.in/send?'+data, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            debug('SMS:Send  success: %s', JSON.stringify(body));
            d.resolve();
        } else {
            debug('SMS:Send  error: %s', error);
            d.reject(error);
        }
    });
    //d.resolve({});
    return d.promise;
};

Sms.prototype.invite = function(from, fromNumber, toNumber) {
    debug('SMS:Invite: to %s , from %s', toNumber, from);
    var d = Q.defer();
    var data = "username=wtjose@gmail.com&hash=8be293b97b1f2e41adbf4c2257882fe024354f85"+
               "&message="+from+" has invited you to Chirpee. Download app from https://drive.google.com/open?id=0B9VGrPjU3g7hWWt5c0RrRUlveHc"+
               "&sender=CHIRPE&numbers="+toNumber;

    request('https://api.textlocal.in/send?'+data, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            d.resolve(JSON.parse(body));
        } else {
            debug('SMS:Send  error: %s', error);
            d.reject(error);
        }
    });
    //d.resolve({});
    return d.promise;
};

exports = module.exports = new Sms();

