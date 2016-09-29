"use strict";
var Q = require("q"),
    Sequelize = require('sequelize');
    database = require('./database');

const debug = require('debug')('chirpp');
    
var AccountProduct = database.define('account_product', {
    productId: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    accountId: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    role: {
        type: Sequelize.STRING
    }
}, {
  freezeTableName: true
});

AccountProduct.sync();

var AccountProducts = function(){};

AccountProducts.prototype.addProduct = function(product){
    debug('AccountProducts:AddProduct:');
    var d = Q.defer();
    AccountProduct.findOne({ where: {productId: product.productId, accountId:product.accountId} }).then(function(accountProductModel) {
        if(!accountProductModel) {
            AccountProduct.create(product).then(function() {
                debug('AccountProducts:AddProduct: successfully added product with id %s ', product.productId);
                d.resolve();            
            }).catch(function(err){
                debug('AccountProducts:AddProduct: failed to add product with id %s ', err);
                d.reject();           
            });
        } else {
            debug('AccountProducts:AddProduct: product already added');
            d.resolve();
        }
    });
    
    return d.promise;    
};

AccountProducts.prototype.addProducts = function(mobile, products){
    debug('AccountProducts:AddProducts: %s', mobile);
    var d = Q.defer();
    var promises = [];
    for (let product of products) {
        var accountProduct = {
            productId : product.productId,
            accountId : mobile,
            role : product.role
        };
        promises.push(this.addProduct(accountProduct));
    }
    Q.all(promises).then(function(){
        debug('AccountProducts:AddProducts: successfully added all products by skipping existing records');
        d.resolve(mobile);   
    }).catch(function(err){
        debug('AccountProducts:AddProducts: failed to add all products');
        d.reject({'error':'AccountProducts.AddProducts','errorCode':'PRD101'});
    });         
    return d.promise;    
};

AccountProducts.prototype.getAccountProducts = function(mobile){
    debug('AccountProducts:GetAccountProducts: %s', mobile);
    var d = Q.defer();
    AccountProduct.findAll({ where: { accountId: mobile } }).then(function(products) {
        if(!products) {
            products = []
        }
        d.resolve({'products' : products});
    }).catch(function(){
        debug('AccountProducts:addDefaultProduct: failed to add product with id %s ', productId);
        d.reject({'error':'AccountProducts.GetAccountProducts','errorCode':'PRD102'});
    });
    return d.promise;    
};

exports = module.exports = new AccountProducts();