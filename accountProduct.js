"use strict";
var Q = require("q"),
    Sequelize = require('sequelize'),
    Product = require('./product'),
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
    role: {//0 for subscriber, 1 for provider, -1 not mapped
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
    Product.getOrFail(product.productId)
    .then(function(){
        AccountProduct.findOrCreate({ where: {productId: product.productId, accountId:product.accountId}, defaults: product })
        .spread(function(product, created) {
            if(created) {
                debug('AccountProducts:AddProduct: successfully added product with id %s ', product.productId);
                d.resolve();            
            } else {
                debug('AccountProducts:AddProduct: product already added');
                d.resolve();
            }
        }).catch(function(error){d.reject(error)})
    }).catch(function(error){d.reject(error)})
    
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
        if(accountProduct.productId && accountProduct.role) {
            debug('AccountProducts:AddProducts: product %s', JSON.stringify(product));
            promises.push(this.addProduct(accountProduct));
        } else {
            debug('AccountProducts:AddProducts: skipping record %s', JSON.stringify(product));
        }
    }
    if(promises.length) {
        Q.all(promises).then(function(){
            debug('AccountProducts:AddProducts: successfully added all products by skipping existing records');
            d.resolve();   
        }).catch(function(err){
            debug('AccountProducts:AddProducts: failed to add all products %s',err);
            d.reject({'error':'AccountProducts.AddProducts '+err.error,'errorCode':'PRD101'});
        });         
    } else {
        d.reject({'error':'productId or role is missing'});   
    }
    return d.promise;    
};

AccountProducts.prototype.getAccountProduct = function(mobile, productId){
    debug('AccountProducts:GetAccountProduct: %s : %s', mobile, productId);
    var d = Q.defer();
    AccountProduct.findOne({ where: { accountId : mobile, productId : productId } })
    .then(function(product) {
        debug('AccountProducts:GetAccountProduct: successfully got product with id %s ', product.productId);
        d.resolve(product);
    }).catch(function(){
        debug('AccountProducts:GetAccountProduct: failed to get product with id %s ', productId);
        d.reject({'error':'AccountProducts.GetAccountProducts :failed to get product','errorCode':'PRD102'});
    });
    return d.promise;    
};


AccountProducts.prototype.getAccountProducts = function(mobile){
    debug('AccountProducts:GetAccountProducts: %s', mobile);
    var d = Q.defer();
    AccountProduct.findAll({ where: { accountId: mobile } }).then(function(products) {
        d.resolve(products);
    }).catch(function(){
        debug('AccountProducts:GetAccountProducts: failed to get products');
        d.reject({'error':'AccountProducts.GetAccountProducts: failed to get products','errorCode':'PRD103'});
    });
    return d.promise;    
};

exports = module.exports = new AccountProducts();