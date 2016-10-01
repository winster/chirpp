"use strict";
var Q = require("q"),
    Sequelize = require('sequelize');
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
    contactName: {
        type: Sequelize.STRING
    },
    contactRole: {//0 for subscriber, 1 for provider, 2 for colleague. Same as contactRole in AccountProductContact
        type: Sequelize.STRING
    },
    active: {
    	type: Sequelize.BOOLEAN 
    }
}, {
  freezeTableName: true
});

AccountProductContact.sync();

var AccountProductContacts = function(){};

AccountProductContacts.prototype.addContact = function(contact){
    debug('AccountProductContacts:AddContact:');
    var d = Q.defer();
    AccountProductContact.findOrCreate({where: {accountId:contact.accountId, productId:contact.productId, contactId:contact.contactId}, defaults:contact})
    .spread(function(contact, created) {
    	debug('AccountProductContacts:AddContact: %s , %s', created, JSON.stringify(contact));
        if(created) {
        	debug('AccountProductContacts:AddContact: successfully added contact with id %s ', contact.contactId);
            d.resolve({'result':'success'});            	
        } else {
            debug('AccountProductContacts:AddContact: contact already added to account');
            d.reject({'error':'AccountProductContacts:AddContact: contact already added to account','errorCode':'CNT101'});            	
        }
    }).catch(function(err){
        debug('AccountProductContacts:AddContact: failed to add contact', err);
        d.reject(err);           
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
        d.resolve({'contacts' : contacts});
    }).catch(function(){
        debug('AccountProductContacts:GetAccountProductContacts: failed to get contacts');
        d.reject({'error':'AccountProductContacts.GetAccountProductContacts','errorCode':'CNT102'});
    });
    return d.promise;    
};

AccountProductContacts.prototype.getOrFail = function(accountId, productId, contactId){
    debug('AccountProductContacts:Get: %s : %s : %s', accountId, productId, contactId);
    var d = Q.defer();
    AccountProductContact.findOne({ where: { accountId:accountId, productId:productId, contactId:contactId } }).then(function(contact) {
        if(contact) {
            d.resolve(contact);
        } else {
        	d.reject({'error':'No relation found','errorCode':'CNT103'});
        }        
    }).catch(function(){
        debug('AccountProductContacts:GetAccountProductContacts: failed to get contacts');
        d.reject({'error':'AccountProductContacts.GetAccountProductContacts','errorCode':'CNT104'});
    });
    return d.promise;    
};


AccountProductContacts.prototype.updateActiveStatus = function(contactId){
    debug('AccountProductContacts:UpdateActiveStatus: %s', contactId);
    var d = Q.defer();
    AccountProductContact.update({active:true}, {where:{contactId:contactId}}).then(function(){
        debug('AccountProductContacts.updateActiveStatus : Successfully updated active status');
        d.resolve();
    }).catch(function(){
        debug('AccountProductContacts.UpdateActiveStatus', 'Error in updating');
        d.reject({'error':'AccountProductContacts.UpdateActiveStatus','errorCode':'CNT105'});
    });         
    return d.promise;    
};

AccountProductContacts.prototype.deleteContact = function(contact){
    debug('AccountProductContacts:DeleteContact:');
    var d = Q.defer();
    AccountProductContact.destroy({where: {accountId:contact.accountId, productId:contact.productId, contactId:contact.contactId}})
    .then(function() {
    	d.resolve({'result':'success'});            	
    }).catch(function(err){
        d.reject(err);           
    });
    return d.promise;    
};

exports = module.exports = new AccountProductContacts();