var app = require('./app'),
    Sms = require('./sms'),
    Product = require('./product'),
    Account = require('./account'),
    AccountProduct = require('./accountProduct'),
    AccountProductContact = require('./accountProductContact'),
    expressJwt = require('express-jwt'),
    Q = require("q"),
    jwt = require('jsonwebtoken'),
    socketSend = require("./websocket").send,
    secret = require('./secret.json'),
    gcloud = require('gcloud'),
    multer = require('multer')({
        inMemory: true,
        fileSize: 5 * 1024 * 1024 // no larger than 5mb, you can change as needed.
    });

const debug = require('debug')('chirpp');


app.post('/otp', function(req, res) {
	debug('Otp','Router');
	var input = req.body;
    if(!input.mobile) {
        var response = {error:"Mobile not present",errorCode:"ROU101"};
        res.json(response);
        return;
    }
    Account.updateOtp(input.mobile)
    .then(Sms.send)
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
    var accessToken;
    Account.verifyOtp(input.mobile, input.otp)
    .then(function(accountModel){
        accessToken = jwt.sign({mobile : accountModel.mobile}, secret.key);
        var d = Q.defer();
        /*at present accessToken saved in DB is used just to check whether a user 
        is registed into system. in each webservice jwt recovers the user from given token */
        Account.updateAccessToken(accountModel, accessToken) 
        .then(function(response){d.resolve(response)})
        .catch(function(error){d.reject()});                     
        return d.promise;
    }).then(function(response){
        var d = Q.defer();
        AccountProduct.getAccountProducts(input.mobile)
        .then(function(products){
            AccountProductContact.getAccountProductContacts(input.mobile)
            .then(function(contacts){
                AccountProductContact.getInvites(input.mobile, contacts.length)
                .then(function(invites){
                    Product.getProducts()
                    .then(function(allProducts){
                        var response = {
                            'all':allProducts, 
                            'products':products, 
                            'contacts':contacts, 
                            'invites':invites,
                            'accessToken':accessToken
                        };
                        d.resolve(response);
                    }).catch(function(err){d.reject(err)});
                }).catch(function(err){d.reject(err)});
            }).catch(function(err){d.reject(err)});
        }).catch(function(err){d.reject(err)});
        return d.promise;
    }).then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
});

app.use('/addProducts', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/addProducts', function(req, res) {
    debug('AddProducts','Router', req.body);
    var products = req.body;
    if(!products || !products.length) {
        var response = {error:"No products present in request",errorCode:"ROU103"};
        res.json(response);
        return;
    }
    AccountProduct.addProducts(req.user.mobile, products)
    .then(function(response){
        var d = Q.defer();
        AccountProduct.getAccountProducts(req.user.mobile)
        .then(function(products){
            AccountProductContact.getAccountProductContacts(req.user.mobile)
            .then(function(contacts){
                Product.getProducts()
                .then(function(allProducts){
                    debug('Router:AddProducts:final closure');
                    var response = {
                        'all':allProducts, 
                        'products':products, 
                        'contacts':contacts
                    };
                    d.resolve(response);
                }).catch(function(err){d.reject(err)});
            }).catch(function(err){d.reject(err)});
        }).catch(function(err){d.reject(err)});
        return d.promise;
    }).then(function(response){res.json(response)})
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
    Account.updateDeviceToken(req.user.mobile, input.deviceToken)
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
    Account.updateSocketId(req.user.mobile, input.socketId)
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
        invited : 0, //invited
        type: 'invite'
    }
    var account;
    Account.get(contact.accountId)
    .then(function(accountModel){
        account = accountModel;
        var d = Q.defer();
        AccountProduct.getAccountProduct(contact.accountId, contact.productId)
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
        debug("Router:addContact:before adding contact");
        AccountProductContact.addContact(contact)
        .then(function(response){d.resolve(response)})
        .catch(function(error){d.reject(error)});
        return d.promise;
    }).then(function(contactModel){
        var d = Q.defer();
        contact.invited = contactModel.invited;
        Account.isOnline(contact.contactId)
        .then(function(response){
            socketSend(response.isOnline,response.socketId,response.deviceToken,contact);
            d.resolve(contact);
        }).catch(function(error){
            Sms.invite(contact.contactId,contact.accountId)
            .then(function(response){d.resolve(response)})
            .catch(function(error){d.reject(error)});
        });
        return d.promise;
    }).then(function(response){res.json({invited:contact.invited})})
    .catch(function(error){res.json(error)});

});


app.use('/acceptInvite', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/acceptInvite', function (req, res) {
    debug('Router:AcceptInvite: %s', req.body);
    var input = req.body;
    if(!(input.productId && input.contactId)) {
        var response = {error:"Product Id or Contact Id not in request",errorCode:"ROU109"};
        res.json(response);
        return;
    }
    if(input.contactId == req.user.mobile) {
        var response = {error:"Logged In user and contactId cannot be the same",errorCode:"ROU110"};
        res.json(response);
        return;
    }
    var contact = {
        accountId : req.user.mobile,
        productId : input.productId,
        contactId : input.contactId.toLowerCase(), //invited
        type: 'acceptInvite'
    }
    var account;
    Account.get(contact.accountId)
    .then(function(){
        var d = Q.defer();
        AccountProduct.getAccountProduct(contact.accountId, contact.productId)
        .then(function(){d.resolve();})
        .catch(function(error){d.reject(error)})
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        AccountProductContact.acceptInvite(contact.accountId, contact.productId, contact.contactId)
        .then(function(){d.resolve()})
        .catch(function(error){d.reject(error)})
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        contact.invited = 1;
        Account.isOnline(contact.contactId)
        .then(function(response){
            socketSend(response.isOnline,response.socketId,response.deviceToken,contact);
            d.resolve(contact);
        }).catch(function(error){d.reject(error)});
        return d.promise;
    }).then(function(response){res.json({invited:1})})
    .catch(function(error){res.json(error)});
});


app.use('/rejectInvite', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/rejectInvite', function (req, res) {
    debug('Router:RejectInvite: %s', req.body);
    var input = req.body;
    if(!(input.productId && input.contactId)) {
        var response = {error:"Product Id or Contact Id not in request",errorCode:"ROU111"};
        res.json(response);
        return;
    }
    if(input.contactId == req.user.mobile) {
        var response = {error:"Logged In user and contactId cannot be the same",errorCode:"ROU112"};
        res.json(response);
        return;
    }
    var contact = {
        accountId : req.user.mobile,
        productId : input.productId,
        contactId : input.contactId.toLowerCase(), //invited
        type: 'rejectInvite'
    }
    var account;
    Account.get(contact.accountId)
    .then(function(){
        var d = Q.defer();
        AccountProduct.getAccountProduct(contact.accountId, contact.productId)
        .then(function(){d.resolve();})
        .catch(function(error){d.reject(error)})
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        AccountProductContact.rejectInvite(contact.accountId, contact.productId, contact.contactId)
        .then(function(){d.resolve();})
        .catch(function(error){d.reject(error)})
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        contact.invited = 2;
        Account.isOnline(contact.contactId)
        .then(function(response){
            socketSend(response.isOnline,response.socketId,response.deviceToken,contact);
            d.resolve(contact);
        }).catch(function(error){d.reject(error)});
        return d.promise;
    }).then(function(response){res.json({invited:2})})
    .catch(function(error){res.json(error)});
});

app.use('/deleteContact', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/deleteContact', function(req, res) {
    debug('Router:DeleteContact: %s',req.body);
    var input = req.body;
    if(!(input.productId && input.contactId)) {
        var response = {error:"Product Id or Contact Id not in request",errorCode:"ROU109"};
        res.json(response);
        return;
    }
    if(input.contactId == req.user.mobile) {
        var response = {error:"User Id and contactId cannot be the same",errorCode:"ROU110"};
        res.json(response);
        return;
    }
    var contact = {
        accountId : req.user.mobile,
        productId : input.productId, 
        contactId : input.contactId            
    }
    AccountProductContact.deleteContact(contact)
    .then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});    
});

app.use('/receipt', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/receipt', function(req, res) {
    debug('Receipt','Router');
    var input = req.body;
    if(!(input.productId && input.contactId && input.messageId)) {
        var response = {error:"Product Id or Contact Id or Message Id not in request",errorCode:"ROU111"};
        res.json(response);
        return;
    }
    if(input.contactId == req.user.mobile) {
        var response = {error:"Cannot send receipt to same user",errorCode:"ROU112"};
        res.json(response);
        return;
    }
    var payload = {
        productId : input.productId,
        contactId : input.contactId,
        messageId : input.messageId,
        type : "receipt"
    }
    Account.isOnline(input.contactId)
    .then(function(response){
        socketSend(response.isOnline,response.socketId,response.deviceToken,payload);
        res.json({"result":"success"});       
    }).catch(function(error){res.json(error)});
});

app.use('/dashboard', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.get('/dashboard', function(req, res) {
    debug('Dashboard','Router');
    AccountProduct.getAccountProducts(req.user.mobile)
    .then(function(response){
        var d = Q.defer();
        AccountProductContact.getAccountProductContacts(req.user.mobile)
        .then(function(contacts){
            AccountProductContact.getInvites(req.user.mobile, contacts.length)
            .then(function(invites){
                var response = {
                    'contacts':contacts,
                    'invites':invites
                };
            });
            d.resolve(response);
        }).catch(function(err){d.reject(err)});
        return d.promise;
    }).then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
}); 

app.use('/image', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/image', function (req, res) {
    debug('ImageUrl', 'Router', req.body);
    var input = req.body;
    if(!(input.imageUrl && input.imageType)) {
        var response = {error:"Image Url or Image type not in request",errorCode:"ROU112"};
        res.json(response);
        return;
    }
    Account.updateImageUrl(req.user.mobile,input.imageUrl, input.imageType)
    .then(function(response){
        var d = Q.defer();
        AccountProductContact.updateImageUrl(req.user.mobile,input.imageUrl, input.imageType)
        .then(function(response){d.resolve(response);})
        .catch(function(err){d.reject(err)});
        return d.promise;
    }).then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
});