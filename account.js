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
    companyEmail:{
        type: Sequelize.STRING
    },
    companyMobile:{
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
    },
    imageUrlIndex:{
        type: Sequelize.INTEGER
    },
    logoUrlIndex:{
        type: Sequelize.INTEGER
    }
}, {
  freezeTableName: true,
  timestamps: true
});

//This will create the table in database
Account.sync({force:true}).then(function () {  
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
            d.reject({'error':'Account does not exist','errorCode':'ACT101'});        
        }
    })
    return d.promise;    
};

Accounts.prototype.updateOtp = function(mobile){
    debug('Account:UpdateOtp: %s:', mobile);
    var d = Q.defer();
    var secret = speakeasy.generateSecret({length: 20});
    var otp = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
    });
    debug('Account:UpdateOtp:secret: %s', secret.base32);    
    var accountObj = {otp:otp, mobile:mobile};            
    Account.findOne({ where: {mobile: mobile} }).then(function(account) {
        if(account) {
            debug('Account:UpdateOtp: Before Account.update');
            Account.update({otp:otp},{where:{mobile:mobile}})
            .then(function(){
                debug('Account:UpdateOtp: Success Account.update');
                accountObj.otp = otp;
                d.resolve(accountObj);
            }).catch(function(err){
                debug('Account:UpdateOtp: Error Account.update %s', err);
                d.reject({'error':'Account.update','errorCode':'ACT104'});
            });
        } else {
            debug('Account:UpdateOtp:Before Account.create');
            Account.create(accountObj).then(function(){
                debug('Account:UpdateOtp: Success Account.create');
                d.resolve(accountObj);
            }).catch(function(err){
                debug('Account:UpdateOtp: Error Account.create %s', err);
                d.reject({'error':'Account.create','errorCode':'ACT102'});
            }); 
        }
    })
    return d.promise;
};

Accounts.prototype.verifyOtp = function(mobile, otp){
    debug('Account:VerifyOtp %s %s', mobile, otp);
    var d = Q.defer();
    Account.findOne({ where: {mobile: mobile} }).then(function(account) {
        if(account) {
            debug('Account:VerifyOtp: account exists');
            if(account.otp==otp){
                debug('Account:VerifyOtp:OTP verification success');
                d.resolve(account);
            } else {
                debug('Account:VerifyOtp:OTP failed to verify');
                d.reject({'error':'OTP failed to verify','errorCode':'ACT106'});            
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
    debug('Account:UpdateDeviceToken: %s, %s', mobile, deviceToken);
    var d = Q.defer();
    debug('Before Account.update', 'Account:UpdateDeviceToken');
    Account.update({'deviceToken':deviceToken}, {where:{'mobile':mobile}}).then(function(){
        debug('Success Account.update', 'Account:UpdateDeviceToken');
        d.resolve({'result':'success'});
    }).catch(function(){
        debug('Error Account.update', 'Account:UpdateDeviceToken');
        d.reject({'error':'Account.update','errorCode':'ACT109'});
    });         
    return d.promise;
};

Accounts.prototype.updateSocketId = function(mobile, socketId){
    debug('Account:UpdateSocketId: %s, %s', mobile, socketId);
    var d = Q.defer();
    debug('Before Account.update', 'Account:UpdateSocketId');
    Account.update({'socketId':socketId}, {where:{'mobile':mobile}}).then(function(){
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
        d.resolve(mobile);
    }).catch(function(){
        debug('Error Account.update', 'Account:Ping');
        d.reject({'error':'Account.update','errorCode':'ACT111'});
    });         
    return d.promise;
};

Accounts.prototype.isOnline = function(mobile){
    debug('Account:IsOnline: %s:', mobile);
    var d = Q.defer();
    debug('Before Account.findOne', 'Account:IsOnline');
    Account.findOne({ where: {mobile: mobile} }).then(function(account) {
        if(account) {
            debug('account exists %s',account.socketId);
            debug('Date.now() %s', Date.now());
            debug('Date.parse(%s) %s', account.updatedAt, Date.parse(account.updatedAt));
            debug('Difference %s', Date.now()-Date.parse(account.updatedAt));
            var response = {isOnline:false,deviceToken:null,socketId:account.socketId};
            if((Date.now()-Date.parse(account.updatedAt)) < 30000){  //30 seconds
                response.isOnline = true;
                d.resolve(response);        
            } else {
                response.deviceToken = account.deviceToken;
                d.resolve(response);        
            }
        } else {
            debug('Account:IsOnline:account not exists');
            d.reject({'error':'Account not exists','errorCode':'ACT112'});      
        }
    })
    return d.promise;
};

Accounts.prototype.updateImageUrl = function(mobile, imageUrl, imageType){
    debug('Account:UpdateImageUrl: %s, %s, %s:', mobile, imageUrl, imageType);
    var d = Q.defer();
    debug('Before Account.update', 'Account:UpdateImageUrl');
    this.get(mobile)
    .then(function(account){
        var updateObj = {};
        if(imageType=='profile') {
            updateObj.imageUrl = imageUrl;
            updateObj.imageUrlIndex = account.imageUrlIndex + 1;
        } else if(imageType=='logo') {
            updateObj.logoUrl = imageUrl;
            updateObj.logoUrlIndex = account.logoUrlIndex + 1;
        }
        Account.update(updateObj, {where:{mobile:mobile}}).then(function(){
            debug('Success Account.update', 'Account:UpdateImageUrl');
            d.resolve(updateObj);
        }).catch(function(){
            debug('Error Account.update', 'Account:UpdateImageUrl');
            d.reject({'error':'Account.update','errorCode':'ACT113'});
        });       
    }).catch(function(err){
        debug('Account:UpdateImageUrl: Error in Account.get');
        d.reject({'error':'Account.get','errorCode':'ACT114'});
    })  
    return d.promise;
};

Accounts.prototype.getAccountDetails = function(accountIds){
    debug('Account:GetAccountDetails: %s', accountIds);
    var d = Q.defer();
    Account.findAll({ where: {mobile: accountIds} }).then(function(accounts) {
        if(accounts) {
            debug('account length %s', accounts.length);
            var accountList = {};
            for(var i=0;i<accounts.length;++i){
                var account = accounts[i];
                accountList[account.mobile]={imageUrl:account.imageUrl,logoUrl:account.logoUrl,name:account.name};
            }
            d.resolve(accountList);        
        } else {
            debug('account not exists', 'Account:GetAccountDetails');
            d.reject();        
        }
    })
    return d.promise;    
};

Accounts.prototype.updateDetails = function(mobile, input){
    debug('Account:UpdateDetails: %s:', JSON.stringify(input));
    var d = Q.defer();
    var updateObj = {};
    if(input.name) {
        updateObj.name = input.name;
    }
    if(input.email) {
        updateObj.email = input.email;
    }
    if(input.companyName) {
        updateObj.companyName = input.companyName;
    }
    if(input.companyEmail) {
        updateObj.companyEmail = input.companyEmail;
    }
    if(input.companyMobile) {
        updateObj.companyMobile = input.companyMobile;
    }
    if(input.companyAddress) {
        updateObj.companyAddress = input.companyAddress;
    }

    Account.update(updateObj, {where:{mobile:mobile}}).then(function(){
        debug('Success Account.update', 'Account:UpdateDetails');
        d.resolve({'result':'success'});
    }).catch(function(){
        debug('Error Account.update', 'Account:UpdateDetails');
        d.reject({'error':'Account.update','errorCode':'ACT114'});
    });         
    return d.promise;
};

exports = module.exports = new Accounts();