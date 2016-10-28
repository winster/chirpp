"use strict";
var Q = require("q"),
    Sequelize = require('sequelize'),
    Account = require('./account'),
    database = require('./database');

const debug = require('debug')('chirpp');
    
var AccountProductContact = database.define('account_product_contact', {
    accountId: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    productId: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    contactId: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING
    },
    email: {
        type: Sequelize.STRING
    },
    contactRole: {//0 for subscriber, 1 for provider, 2 for colleague. 
        type: Sequelize.STRING
    },
    status: { //0 for usual, 1 for invite sent, 2 for invite received, 3 for invite got rejected, 4 for invite rejected
    	type: Sequelize.STRING 
    },
    companyName: {
        type: Sequelize.STRING 
    },
    companyEmail: {
        type: Sequelize.STRING 
    },
    companyMobile:{
        type: Sequelize.STRING
    },
    companyAddress: {
        type: Sequelize.STRING 
    },
    imageUrl:{
        type: Sequelize.STRING
    },
    logoUrl:{
        type: Sequelize.STRING
    },
    imageUrlUpdatedAt:{
        type: Sequelize.DATE
    },
    logoUrlUpdatedAt:{
        type: Sequelize.DATE
    }
}, {
  freezeTableName: true
});

AccountProductContact.sync();

var AccountProductContacts = function(){};

AccountProductContacts.prototype.addContact = function(user1, user2, contact){
    debug('AccountProductContacts:AddContact:');
    var d = Q.defer();
    var that = this;
    that.get(user1.mobile, contact.productId, user2.mobile)
    .then(function(){
        debug('AccountProductContacts:AddContact:contact already exist');
        d.reject({'error':'contact already added'});
    }).catch(function(){
        debug('AccountProductContacts:AddContact:Before adding contact for user2');
        var user1Status = 1;
        that.addUser2(user1, user2, contact)
        .then(function(user2Status){
            if(user2Status==4){
                user1Status=3;
            } else if(user2Status==2){
                user1Status=1;
            }
            var user1Contact = {
                accountId: contact.accountId,
                productId: contact.productId,
                contactId: contact.contactId,
                status: user1Status//user1 has invited user2
            }
            if(user2){
                user1Contact.name = user2.name;
                user1Contact.email = user2.email;
                user1Contact.imageUrl = user2.imageUrl;
                user1Contact.logoUrl = user2.logoUrl;
                user1Contact.companyName = user2.companyName;
                user1Contact.companyEmail = user2.companyEmail;
                user1Contact.companyMobile = user2.companyMobile;
                user1Contact.companyAddress = user2.companyAddress;
            }
            AccountProductContact.create(user1Contact)
            .then(function(){d.resolve(user2Status);})
            .catch(function(){d.reject();})
        }).catch(function(){d.reject();})
    });
    return d.promise;    
};

AccountProductContacts.prototype.getAccountProductContacts = function(accountId){
    debug('AccountProductContacts:GetAccountProductContacts: %s', accountId);
    var d = Q.defer();
    AccountProductContact.findAll({ where: { accountId: accountId } }).then(function(contacts) {
        if(!contacts) {
            contacts = []
        }
        d.resolve(contacts);
    }).catch(function(){
        debug('AccountProductContacts:GetAccountProductContacts: failed to get contacts');
        d.resolve([]);
    });
    return d.promise;    
};

AccountProductContacts.prototype.get = function(accountId, productId, contactId){
    debug('AccountProductContacts:Get: %s : %s : %s', accountId, productId, contactId);
    var d = Q.defer();
    AccountProductContact.findOne({ where: { accountId:accountId, productId:productId, contactId:contactId } }).then(function(contact) {
        if(contact) {
            d.resolve(contact);
        } else {
        	d.reject({'error':'No contact found','errorCode':'CNT103'});
        }        
    });
    return d.promise;    
};

AccountProductContacts.prototype.acceptInvite = function(accountId, productId, contactId){
    debug('AccountProductContacts:AcceptInvite: %s, %s, %s', accountId, productId, contactId);
    var d = Q.defer();
    var that = this;
    that.get(accountId, productId, contactId)
    .then(function(){
        debug('AccountProductContacts.AcceptInvite : user 1 contact exists');
        that.get(contactId, productId, accountId)
        .then(function(){
            debug('AccountProductContacts.AcceptInvite : user 2 contact exists');
            AccountProductContact.update({status:0}, {where:{accountId:accountId, productId:productId, contactId:contactId}})
            .then(function(){
                debug('AccountProductContacts.AcceptInvite : user 1 contact status updated to 0');
                AccountProductContact.update({status:0}, {where:{accountId:contactId, productId:productId, contactId:accountId}})
                .then(function(){
                    debug('AccountProductContacts.AcceptInvite : user 2 contact status updated to 0');
                    d.resolve({'result':'success'});
                }).catch(function(err){d.reject({'error':'AccountProductContacts.AcceptInvite','errorCode':'CNT104'});});
            }).catch(function(err){d.reject({'error':'AccountProductContacts.AcceptInvite','errorCode':'CNT105'});});          
        }).catch(function(err){d.reject({'error':'AccountProductContacts.AcceptInvite','errorCode':'CNT106'});});
    }).catch(function(err){d.reject({'error':'AccountProductContacts.AcceptInvite','errorCode':'CNT107'});});
    return d.promise;    
};

AccountProductContacts.prototype.rejectInvite = function(accountId, productId, contactId){
    debug('AccountProductContacts:RejectInvite: %s, %s, %s', accountId, productId, contactId);
    var d = Q.defer();
    var that = this;
    that.get(accountId, productId, contactId)
    .then(function(){
        debug('AccountProductContacts.RejectInvite : user 1 contact exists');
        that.get(contactId, productId, accountId)
        .then(function(){
            debug('AccountProductContacts.RejectInvite : user 2 contact exists');
            AccountProductContact.update({status:4}, {where:{accountId:accountId, productId:productId, contactId:contactId}})
            .then(function(){
                debug('AccountProductContacts.RejectInvite : user 1 contact status updated to 4');
                AccountProductContact.update({status:3}, {where:{accountId:contactId, productId:productId, contactId:accountId}})
                .then(function(){
                    debug('AccountProductContacts.RejectInvite : user 2 contact status updated to 3');
                    d.resolve({'result':'success'});
                }).catch(function(err){d.reject({'error':'AccountProductContacts.RejectInvite','errorCode':'CNT108'});});
            }).catch(function(err){d.reject({'error':'AccountProductContacts.RejectInvite','errorCode':'CNT109'});});          
        }).catch(function(err){d.reject({'error':'AccountProductContacts.RejectInvite','errorCode':'CNT110'});});
    }).catch(function(err){d.reject({'error':'AccountProductContacts.RejectInvite','errorCode':'CNT111'});});
    return d.promise;      
};

AccountProductContacts.prototype.deleteContact = function(accountId, productId, contactId){
    debug('AccountProductContacts:DeleteContact: %s, %s, %s', accountId, productId, contactId);
    var d = Q.defer();
    var that = this;
    that.get(accountId, productId, contactId)
    .then(function(){
        debug('AccountProductContacts.DeleteContact : user 1 contact exists');
        that.get(contactId, productId, accountId)
        .then(function(){
            debug('AccountProductContacts.DeleteContact : user 2 contact exists');
            AccountProductContact.update({status:3}, {where:{accountId:accountId, productId:productId, contactId:contactId, status:[0,1,2,3]}})
            .then(function(){
                debug('AccountProductContacts.DeleteContact : user 2 contact status updated to 3 except if it was 4');
                AccountProductContact.destroy({where: {accountId:accountId, productId:productId, contactId:contactId}})
                .then(function() {
    	            debug('AccountProductContacts.DeleteContact : user 1 contact deleted');
                    d.resolve({'result':'success'});            	
                }).catch(function(err){
                    debug('AccountProductContacts.DeleteContact : user 1 contact failed to delete', err);
                    d.reject({'error':'AccountProductContacts.deleteContact','errorCode':'CNT112'});           
                });
            }).catch(function(err){d.reject({'error':'AccountProductContacts.DeleteContact','errorCode':'CNT113'});});
        }).catch(function(err){d.reject({'error':'AccountProductContacts.DeleteContact','errorCode':'CNT114'});});
    }).catch(function(err){d.reject({'error':'AccountProductContacts.DeleteContact','errorCode':'CNT115'});});
    return d.promise;    
};

AccountProductContacts.prototype.updateImageUrl = function(contactId, imageUrl, imageType){
    debug('AccountProductContacts:updateImageUrl: %s %s %s', contactId, imageUrl, imageType);
    var d = Q.defer();
    var updateObj = {};
    if(imageType=='profile') {
        updateObj.imageUrl = imageUrl;
        updateObj.imageUrlUpdatedAt = new Date();
    } else if(imageType=='logo') {
        updateObj.logoUrl = imageUrl;
        updateObj.logoUrlUpdatedAt = new Date();
    }
    AccountProductContact.update(updateObj, {where:{contactId:contactId}}).then(function(){
        debug('AccountProductContacts.updateImageUrl : Successfully updated image urls');
        d.resolve({'result':'success'});
    }).catch(function(err){
        debug(err);
        d.reject({'error':'AccountProductContacts.updateImageUrl','errorCode':'CNT107'});
    });         
    return d.promise;    
};

/*
* Add contact in many cases have to create 2 records
* User2 as contact of user1
* User1 as contact of user2
* This method does 2nd task
*/
AccountProductContacts.prototype.addUser2 = function(user1, user2, contact){
    debug('AccountProductContacts:addUser2:');
    var d = Q.defer();
    var status = 2;
    this.get(user2.mobile, contact.productId, user1.mobile)
    .then(function(contactModel){ // this row exists only if user1 has deleted user2, which is considered as reject
        if(contactModel.status==3){ //in the previous request, user2 had accepted invite
            status = 2;
            AccountProductContact.update({status:status}, {where:{accountId:user2.mobile, productId:contact.productId, contactId:user1.mobile}})
            .then(function(){
                debug('AccountProductContacts.addUser2 : Successfully updated status of user 2');
                d.resolve(status);
            }).catch(function(err){
                debug('AccountProductContacts.addUser2 : Error in updating status of user 2', err);
                d.reject({'error':'AccountProductContacts.addUser2','errorCode':'CNT108'});
            });
        } else {//the only other value of status is 4, where user2 had rejected the invite of user1.
            d.resolve(contactModel.status);
        }
    }).catch(function(){
        var user2Contact = {
            accountId: contact.contactId,
            productId: contact.productId,
            contactId: contact.accountId,
            status: status, //user2 is invited by user1
            name: user1.name,
            email: user1.email,
            imageUrl: user1.imageUrl,
            logoUrl: user1.logoUrl,
            companyName: user1.companyName,
            companyEmail: user1.companyEmail,
            companyMobile: user1.companyMobile,
            companyAddress: user1.companyAddress
        }
        AccountProductContact.create(user2Contact)
        .then(function(){d.resolve(status);})
        .catch(function(){d.reject();})
    });
    return d.promise;    
};

AccountProductContacts.prototype.updateDetails = function(contactId, input){
    debug('AccountProductContacts:UpdateDetails: %s:', JSON.stringify(input));
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
    AccountProductContact.update(updateObj, {where:{contactId:contactId}}).then(function(){
        debug('Success AccountProductContact.update', 'AccountProductContacts:UpdateDetails');
        d.resolve({'result':'success'});
    }).catch(function(){
        debug('Error AccountProductContact.update', 'AccountProductContacts:UpdateDetails');
        d.reject({'error':'AccountProductContact.update','errorCode':'CNT109'});
    });         
    return d.promise;
};


exports = module.exports = new AccountProductContacts();