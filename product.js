var Q = require("q"),
    Sequelize = require('sequelize');
    database = require('./database');

const debug = require('debug')('chirpp');
    
var Product = database.define('product', {
    productId: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING
    },
    code: {
        type: Sequelize.STRING
    },
    description: {
        type: Sequelize.STRING
    },
    status:{
        type: Sequelize.STRING
    }
}, {
  freezeTableName: true,
  timestamps: true
});

//This will create the table in database
Product.sync({force:true}).then(function () {
    var defaultProduct = {
        productId:'P001',
        name:'Utility',
        description:'Manage your milkman, news paper boy etc',
        status:1
    };
    Product.create(defaultProduct).then(function(){
        debug('Products:sync');    
    }) .catch(function(err){
        debug('Products:sync:error:'+error);    
    }); 
});

var Products = function(){};

Products.prototype.getProducts = function(){
    debug('Products:GetProducts:');
    var d = Q.defer();
    Product.findAll().then(function(products) {
        if(!products) {
            products = []
        }
        d.resolve(products);
    }).catch(function(){
        d.reject({'error':'Products.GetProducts','errorCode':'PRD101'});
    });
    return d.promise;    
};

Products.prototype.getOrFail = function(productId){
    debug('Products:GetOrFail:');
    var d = Q.defer();
    Product.findOne().then(function(product) {
        if(product) {
            debug('product exists', 'Products:GetOrFail');
            d.resolve(product);
        } else {
            debug('product not exists', 'Products:GetOrFail');
            d.reject({'error':'Product does not exist','errorCode':'PRD102'});
        }
    }).catch(function(){
        d.reject({'error':'Products.GetOrFail','errorCode':'PRD103'});
    });
    return d.promise;    
};

exports = module.exports = new Products();