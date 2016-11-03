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
    .then(function(response){res.json({'result':'success'})})
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
                Product.getProducts()
                .then(function(allProducts){
                    Account.get(input.mobile)
                    .then(function(account){
                        var profile = {
                            name: account.name,
                            mobile: account.mobile,
                            email: account.email,
                            companyName: account.companyName,
                            companyEmail: account.companyEmail,
                            companyMobile: account.companyMobile,
                            companyAddress: account.companyAddress,
                            imageUrl: account.imageUrl,
                            logoUrl: account.logoUrl
                        }
                        var response = {
                            'profile': profile,
                            'all':allProducts, 
                            'products':products, 
                            'contacts':contacts, 
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
                debug('Router:AddProducts:final closure');
                var response = {
                    'products':products, 
                    'contacts':contacts
                };
                d.resolve(response);
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

app.use('/addContact', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

/*
*User 1 adds User 2
*/
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
        name : input.name,
        contactRole : input.contactRole
    }
    var user1Entity,user2Entity;
    Account.get(contact.accountId)
    .then(function(accountModel){
        user1Entity = accountModel;
        var d = Q.defer();
        d.resolve();
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        Account.get(contact.contactId)
        .then(function(accountModel){
            user2Entity=accountModel;
            d.resolve();
        }).catch(function(){
            d.resolve()
        })
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        AccountProduct.getAccountProduct(contact.accountId, contact.productId)
        .then(function(productModel){
            if(contact.contactRole==productModel.role){
                d.reject({error: 'User 1 Product Role and Contact Role cannot be the same',errorCode:"ROU108"});
            } else {
                debug("Router:addContact:User 1 Product Role and Contact Role are different which is correct");
                d.resolve();
            }
        }).catch(function(error){d.reject(error)})
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        if(user2Entity) {
            AccountProduct.getAccountProduct(contact.contactId, contact.productId)
            .then(function(productModel){
                if(contact.contactRole!=productModel.role){
                    d.reject({error: 'Contact Role does not match with User2 Product role',errorCode:"ROU109"});
                } else {
                    debug("Router:addContact:Contact Role matches with User2 Product role");
                    d.resolve();
                }
            }).catch(function(){d.resolve()})
        } else {
            d.resolve();
        }
        return d.promise;
    }).then(function(){
        var d = Q.defer();
        AccountProductContact.addContact(user1Entity,user2Entity,contact)
        .then(function(userStatus){d.resolve(userStatus)})
        .catch(function(error){d.reject(error)});
        return d.promise;
    }).then(function(userStatus){
        var d = Q.defer();
        debug("Router:addContact:before sending the notification %s", JSON.stringify(userStatus));
        var payload = {
            pid:contact.productId,
            cid:contact.accountId,
            t:'contact',
            d: {
                productId:contact.productId,
                contactId:contact.accountId,
                name:user1Entity.name,
                email:user1Entity.email,
                status:userStatus.user2Status,
                companyName:user1Entity.companyName,
                companyEmail:user1Entity.companyEmail,
                companyMobile:user1Entity.companyMobile,
                companyAddress:user1Entity.companyAddress,
                imageUrl:user1Entity.imageUrl,
                logoUrl:user1Entity.logoUrl
            }
        }
        contact.status = userStatus.user1Status;
        Account.isOnline(contact.contactId)
        .then(function(response){
            socketSend(response.isOnline,response.socketId,response.deviceToken,payload);
            d.resolve(contact);
        }).catch(function(error){
            Sms.invite(user1Entity.name, user1Entity.accountId, contact.contactId)
            .then(function(response){d.resolve(contact)})
            .catch(function(error){d.resole()});
        });
        return d.promise;
    }).then(function(response){res.json(response)})
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
        contactId : input.contactId.toLowerCase()
    }
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
        contact.status = 5;
        var payload = {
            pid:contact.productId,
            cid:contact.accountId,
            t:'contact',
            d: contact
        }
        Account.isOnline(contact.contactId)
        .then(function(response){
            socketSend(response.isOnline,response.socketId,response.deviceToken,payload);
            d.resolve();
        }).catch(function(error){d.reject(error)});
        return d.promise;
    }).then(function(response){res.json({'contactId':contact.contactId,'productId':contact.productId})})
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
        contactId : input.contactId.toLowerCase()
    }
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
        var payload = contact;
        payload.status=3;
        payload.type='contact';
        Account.isOnline(contact.contactId)
        .then(function(response){
            socketSend(response.isOnline,response.socketId,response.deviceToken,payload);
            d.resolve();
        }).catch(function(error){d.reject(error)});
        return d.promise;
    }).then(function(response){res.json({'contactId':contact.contactId,'productId':contact.productId})})
    .catch(function(error){res.json(error)});
});

app.use('/deleteContact', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/deleteContact', function(req, res) {
    debug('Router:DeleteContact');
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
    AccountProductContact.deleteContact(contact.accountId, contact.productId, contact.contactId)
    .then(function(status){
        debug("before sending payload %s", status);
        var d = Q.defer();
        var payload = contact;
        payload.status=status;
        payload.type='contact';
        Account.isOnline(contact.contactId)
        .then(function(response){
            socketSend(response.isOnline,response.socketId,response.deviceToken,payload);
            d.resolve();
        }).catch(function(error){d.resolve();});
        return d.promise;
    }).then(function(response){res.json({'contactId':contact.contactId,'productId':contact.productId})})
    .catch(function(error){res.json(error)});    
});

app.use('/deliveryStatus', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/deliveryStatus', function(req, res) {
    debug('Router:DeliveryStatus');
    var input = req.body;
    if(!(input.productId && input.contactId && input.messageId && input.status)) {
        var response = {error:"Product Id or Contact Id or Message Id not in request",errorCode:"ROU111"};
        res.json(response);
        return;
    }
    if(input.contactId == req.user.mobile) {
        var response = {error:"Cannot send Router to same user",errorCode:"ROU112"};
        res.json(response);
        return;
    }
    var payload = {
        messageId : input.messageId,
        status: input.status,
        type : "deliveryStatus"
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
            var response = {
                'contacts':contacts
            };
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
    Account.updateImageUrl(req.user.mobile, input.imageUrl, input.imageType)
    .then(function(updateObj){
        var d = Q.defer();
        AccountProductContact.updateImageUrl(req.user.mobile, input.imageUrl, input.imageType, updateObj)
        .then(function(response){d.resolve(response);})
        .catch(function(err){d.reject(err)});
        return d.promise;
    }).then(function(response){res.json(response)})
    .catch(function(error){res.json(error)});
});

app.use('/profile', expressJwt({secret: secret.key, getToken: function(req){
    var token = null || req.body.token || req.query.token || req.headers['x-access-token'];
    return token;
}}));

app.post('/profile', function (req, res) {
    debug('Profile', 'Router', req.body);
    var input = req.body;
    var waitTill = new Date(new Date().getTime() + 2 * 1000);
    while(waitTill > new Date()){}
    Account.updateDetails(req.user.mobile, input)
    .then(function(response){
        var d = Q.defer();
        AccountProductContact.updateDetails(req.user.mobile,input)
        .then(function(response){d.resolve(response);})
        .catch(function(err){d.reject(err)});
        return d.promise;
    }).then(function(response){res.json({'result':'success'})})
    .catch(function(error){res.json(error)});
});