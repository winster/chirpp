var speakeasy = require("speakeasy"),
    Q = require("q"),
    Sequelize = require('sequelize'),
    database = require('./database');

const debug = require('debug')('chirpp');
    
var Account = database.define('account', {
    mobile: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    otp: {
        type: Sequelize.STRING
    },
    name: {
        type: Sequelize.STRING
    },
    email: {
        type: Sequelize.STRING
    },
    companyName:{
        type: Sequelize.STRING
    },
    companyAddress:{
        type: Sequelize.STRING
    },
    accessToken:{
        type: Sequelize.STRING
    },
    refreshToken:{
        type: Sequelize.STRING
    },
    deviceToken:{
        type: Sequelize.STRING
    },
    socketId:{
        type: Sequelize.STRING
    },
    imageUrl:{
        type: Sequelize.STRING
    },
    logoUrl:{
        type: Sequelize.STRING
    }
}, {
  freezeTableName: true,
  timestamps: true
});

//This will create the table in database
Account.sync().then(function () {  
});

var Accounts = function(){};

Accounts.prototype.get = function(mobile){
    debug('Account:Get: %s', mobile);
    var d = Q.defer();
    Account.findOne({ where: {mobile: mobile} }).then(function(account) {
        if(account) {
            debug('account exists', 'Account:Get');
            d.resolve(account);        
        } else {
            debug('account not exists', 'Account:Get');
            d.resolve({mobile:mobile});        
        }
    })
    return d.promise;    
};

Accounts.prototype.getOrFail = function(mobile){
    debug('Account:GetOrFail: %s', mobile);
    var d = Q.defer();
    Account.findOne({ where: {mobile: mobile} }).then(function(account) {
        if(account) {
            debug('account exists', 'Account:GetOrFail');
            d.resolve(account, options);        
        } else {
            debug('account not exists', 'Account:GetOrFail');
            d.reject({'error':'Account not exists','errorCode':'ACT101'});        
        }
    })
    return d.promise;    
};

Accounts.prototype.updateOtp = function(accountModel){
    debug('Account:UpdateOtp: %s:', accountModel);
    var d = Q.defer();
    var secret = speakeasy.generateSecret({length: 20});
    var otp = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
    });
    debug('Account:UpdateOtp:secret: %s', secret.base32);    
    if (!accountModel.createdAt){
        debug('Account:UpdateOtp:Before Account.create');
        var account = {otp:otp, mobile:accountModel.mobile};    
        Account.create(account).then(function(){
            debug('Account:UpdateOtp: Success Account.create');
            d.resolve(account);
        }).catch(function(e){
            debug('Account:UpdateOtp: Error Account.create');
            d.reject({'error':'Account.create','errorCode':'ACT102'});
        });
    } else {
        debug('Account:UpdateOtp: Before Account.findOne');
        Account.findOne({ where: {mobile: accountModel.mobile} }).then(function(account) {
            debug('Account:UpdateOtp:Account.findOne: %s',account);
            if(account.accessToken) {//this means, user has already logged into the application once
                debug('Account:UpdateOtp:Account.findOne:accessToken: %s', account.accessToken);
                d.reject({'error':'Account.accessToken present','errorCode':'ACT103'});
            } else {
                debug('Account:UpdateOtp:Before Account.update');
                account.update({otp:otp}).then(function(){
                    debug('Account:UpdateOtp: Success Account.update');
                    account.otp = otp;
                    d.resolve(account);
                }).catch(function(){
                    debug('Account:UpdateOtp: Error Account.update');
                    d.reject({'error':'Account.update','errorCode':'ACT104'});
                });
            }
        })          
    }  
    return d.promise;
};

Accounts.prototype.verifyOtp = function(mobile, otp){
    debug('Account:VerifyOtp %s %s', mobile, otp);
    var d = Q.defer();
    Account.findOne({ where: {mobile: mobile} }).then(function(account) {
        if(account) {
            debug('Account:VerifyOtp: account exists');
            if(account.accessToken) {//this means, user has already logged into the application once
                debug('Account:verifyOtp:Account.findOne:accessToken: %s', account.accessToken);
                d.reject({'error':'Account.accessToken present','errorCode':'ACT105'});
            } else {
                if(account.otp==otp){
                    debug('Account:VerifyOtp:OTP verification success');
                    d.resolve(account);
                } else {
                    debug('Account:VerifyOtp:OTP failed to verify');
                    d.reject({'error':'OTP failed to verify','errorCode':'ACT106'});            
                }
            }            
        } else {
            debug('Account:VerifyOtp:account not exists');
            d.reject({'error':'Account not exists','errorCode':'ACT107'});        
        }
    })
    return d.promise;    
};

Accounts.prototype.updateAccessToken = function(accountModel, accessToken){
    debug('Account:UpdateAccessToken: %s, %s:', accountModel['mobile'], accessToken);
    var d = Q.defer();
    debug('Before Account.update', 'Account:UpdateAccessToken');
    Account.update({accessToken:accessToken}, {where:{mobile:accountModel['mobile']}}).then(function(){
        debug('Success Account.update', 'Account:UpdateAccessToken');
        d.resolve({'result':'success'});
    }).catch(function(){
        debug('Error Account.update', 'Account:UpdateAccessToken');
        d.reject({'error':'Account.update','errorCode':'ACT108'});
    });         
    return d.promise;
};

Accounts.prototype.updateDeviceToken = function(mobile, deviceToken){
    debug('Account:UpdateDeviceToken: %s, %s:', mobile, deviceToken);
    var d = Q.defer();
    debug('Before Account.update', 'Account:UpdateDeviceToken');
    Account.update({deviceToken:deviceToken}, {where:{mobile:mobile}}).then(function(){
        debug('Success Account.update', 'Account:UpdateDeviceToken');
        d.resolve({'result':'success'});
    }).catch(function(){
        debug('Error Account.update', 'Account:UpdateDeviceToken');
        d.reject({'error':'Account.update','errorCode':'ACT109'});
    });         
    return d.promise;
};

Accounts.prototype.updateSocketId = function(mobile, socketId){
    debug('Account:UpdateSocketId: %s, %s:', mobile, socketId);
    var d = Q.defer();
    debug('Before Account.update', 'Account:UpdateSocketId');
    Account.update({socketId:socketId}, {where:{mobile:mobile}}).then(function(){
        debug('Success Account.update', 'Account:UpdateSocketId');
        d.resolve({'result':'success'});
    }).catch(function(){
        debug('Error Account.update', 'Account:UpdateSocketId');
        d.reject({'error':'Account.update','errorCode':'ACT110'});
    });         
    return d.promise;
};

Accounts.prototype.ping = function(mobile){
    debug('Account:Ping: %s:', mobile);
    var d = Q.defer();
    debug('Before Account.update', 'Account:Ping');
    Account.update({}, {where:{mobile:mobile}}).then(function(){
        debug('Success Account.update', 'Account:Ping');
        d.resolve({'result':'success'});
    }).catch(function(){
        debug('Error Account.update', 'Account:UpdateSocketId');
        d.reject({'error':'Account.update','errorCode':'ACT110'});
    });         
    return d.promise;
};

exports = module.exports = new Accounts();