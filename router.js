var app = require('./app'),
    sms = require('./sms'),
    account = require('./account'),
    product = require('./product'),
    accountProduct = require('./accountProduct'),
    AccountProductContact = require('./accountProductContact'),
    expressJwt = require('express-jwt'),
    Q = require("q"),
    jwt = require('jsonwebtoken'),
    secret = require('./secret.json');


const debug = require('debug')('chirpp');

app.post('/otp', function(req, res) {
	debug('Otp','Router');
	var input = req.body;
    if(!input.mobile) {
        var response = {error:"Mobile not present",errorCode:"ROU101"};
        res.json(response);
        return;
    }
    account.get(input.mobile)
    .then(account.updateOtp)
    .then(sms.send)
    .then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
});

app.post('/login', function(req, res) {
    debug('Login','Router');
    var input = req.body;
    if(!(input.mobile && input.otp)) {
        var response = {error:"Mobile or Otp not present",errorCode:"ROU102"};
        res.json(response);
        return;
    }
    account.verifyOtp(input.mobile, input.otp)
    .then(function(accountModel){
        var accessToken = jwt.sign({mobile : accountModel.mobile}, secret.key);
        res.setHeader('Access-Token',accessToken);
        var d = Q.defer();
        account.updateAccessToken(accountModel, accessToken) //at present accessToken saved in DB is not used. jwt recovers the object from given token 
        .then(function(response){d.resolve(response)})
        .catch(function(error){d.reject()});                     
        return d.promise;
    })
    .then(function(response){
        var d = Q.defer();
        AccountProductContact.updateActiveStatus(input.mobile)
        .then(function(){d.resolve(response);})
        .catch(function(err){d.reject(err);})        
        return d.promise;  
    })
    .then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
});

app.use('/addProducts', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/addProducts', function(req, res) {
    debug('AddProducts','Router');
    var products = req.body;
    if(!products || !products.length) {
        var response = {error:"No products present in request",errorCode:"ROU103"};
        res.json(response);
        return;
    }
    accountProduct.addProducts(req.user.mobile, products)
    .then(accountProduct.getAccountProducts)
    .then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
}); 
        

app.use('/deviceToken', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/deviceToken', function(req, res) {
    debug('DeviceToken','Router');
    var input = req.body;
    if(!input.deviceToken) {
        var response = {error:"No device token in request",errorCode:"ROU104"};
        res.json(response);
        return;
    }
    account.updateDeviceToken(req.user.mobile, input.deviceToken)
    .then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
});    

app.use('/socketId', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/socketId', function(req, res) {
    debug('SocketId','Router');
    var input = req.body;
    if(!input.socketId) {
        var response = {error:"No socket Id in request",errorCode:"ROU105"};
        res.json(response);
        return;
    }
    account.updateSocketId(req.user.mobile, input.socketId)
    .then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
});    


app.use('/addContact', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/addContact', function(req, res) {
    debug('AddContact','Router');
    var input = req.body;
    if(!(input.productId && input.contactId)) {
        var response = {error:"Product Id or Contact Id not in request",errorCode:"ROU106"};
        res.json(response);
        return;
    }
    if(input.contactId == req.user.mobile) {
        var response = {error:"Cannot add same user to contacts",errorCode:"ROU107"};
        res.json(response);
        return;
    }
    var contact = {
        accountId : req.user.mobile,
        productId : input.productId,
        contactId : input.contactId.toLowerCase(),  //handle mobile number format
        contactName : input.contactName,
        contactRole : input.contactRole,
        active : false
    }
    account.getOrFail(contact.accountId)
    .then(function(){
        var d = Q.defer();
        accountProduct.getAccountProduct(contact.accountId, contact.productId)
        .then(function(product){
            if(contact.contactRole==product.role){
                d.reject({error: 'Product Role and Contact Role cannot be the same',errorCode:"ROU108"});
            } else {
                d.resolve(contact);
            }
        }).catch(function(error){d.reject(error)})
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        account.get(contact.contactId)
        .then(function(response){d.resolve(response)})
        .catch(function(error){d.reject(error)});
        return d.promise;
    }).then(function(contactObj){
        var d = Q.defer();
        debug("Router:addContact:checkContactExists %s", JSON.stringify(contactObj));
        if(contactObj.accessToken){
            contact.active = true;  //updating function scope "contact" object (refer line 127)
            d.resolve(contact);
        } else {
            sms.invite(contact.contactId,contact.accountId)
            .then(function(response){d.resolve(contact)})
            .catch(function(error){d.reject(error)});
        }
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        debug("Router:addContact:before adding contact");
        AccountProductContact.addContact(contact)
        .then(function(response){
            if(!contact.active){
                response.description = 'Account does not exist in system. But added to contacts';
            } 
            d.resolve(response);
        }).catch(function(error){d.reject(error)})
        return d.promise;
    })
    .then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});

});


app.use('/deleteContact', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/deleteContact', function(req, res) {
    debug('DeleteContact','Router');
    var input = req.body;
    if(!(input.productId && input.contactId)) {
        var response = {error:"Product Id or Contact Id not in request",errorCode:"ROU109"};
        res.json(response);
        return;
    }
    if(input.contactId == req.user.mobile) {
        var response = {error:"Cannot delete same user to contacts",errorCode:"ROU110"};
        res.json(response);
        return;
    }
    account.getOrFail(req.user.mobile)
    .then(function(){
        var d = Q.defer();
        var contact = {
            accountId : req.user.mobile,
            productId : input.productId, 
            contactId : input.contactId            
        }
        AccountProductContact.deleteContact(contact)
        .then(function(response){d.resolve(response)})
        .catch(function(error){d.reject(error)});
        return d.promise;
    })
    .then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});    
});