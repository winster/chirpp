var Q = require("q"),
    Sequelize = require('sequelize');
    database = require('./database');

const debug = require('debug')('chirpp');
    
var MessageHistory = database.define('message_history', {
    mid: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    aid: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    cid: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    pid: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    t: {
        type: Sequelize.STRING
    },
    d: {
        type: Sequelize.TEXT
    },
    time: {
        type: Sequelize.BIGINT
    }
}, {
  freezeTableName: true,
  timestamps: true
});

MessageHistory.sync();

var Messages = function(){};

Messages.prototype.getAll = function(aid){
    debug('Messages:GetAll: %s', aid);
    var d = Q.defer();
    MessageHistory.findAll({where:{aid:aid}, order: [['updatedAt']]})
    .then(function(msgs) {
        debug('Messages:GetAll:result: %s', msgs);
        d.resolve(msgs);
    }).catch(function(){
        d.reject({'error':'Messages:GetAll','errorCode':'MSG101'});
    });
    return d.promise;    
};

Messages.prototype.getOrFail = function(aid,cid,pid,mid){
    debug('Messages:GetOrFail: %s %s %s %s', aid, cid, pid, mid);
    var d = Q.defer();
    MessageHistory.findAll({where:{aid:aid,cid:cid,pid:pid,mid:mid}})
    .then(function(msgs) {
        debug('Messages:GetOrFail:result: %s', msgs);
        if(!msgs || !msgs.length){
            d.reject();
        } else {
            d.resolve(msgs);
        }
    }).catch(function(){
        d.reject({'error':'Messages:GetOrFail','errorCode':'MSG102'});
    });
    return d.promise;       
};

Messages.prototype.delete = function(aid, cid, pid, mid){
    debug('Messages:Delete: %s %s %s %s', aid, cid, pid, mid);
    if(!aid){
        return;
    }
    var whereObj = {
        aid:aid
    }
    if(cid){
        whereObj.cid = cid;
    }
    if(pid){
        whereObj.pid = pid;
    }
    if(mid){
        whereObj.mid = mid;
    }
    var d = Q.defer();
    MessageHistory.destroy({where:whereObj})
    .then(function(msgs) {
        debug('Messages:Delete:result: %s', msgs);
        d.resolve(msgs);
    }).catch(function(){
        d.reject({'error':'Messages:Delete','errorCode':'MSG103'});
    });
    return d.promise;       
};

Messages.prototype.save = function(msg){
    debug('Messages:Save: %s ', JSON.stringify(msg));
    var d = Q.defer();
    var messageData = msg.d;
    if(!msg.mid){
        msg.mid='';
    }
    var message = {
        aid:msg.aid,
        cid:msg.cid,
        pid:msg.pid,
        mid:msg.mid,
        t:msg.t,
        time:msg.time,
        d:messageData
    };
    var that = this;
    that.getOrFail(msg.aid, msg.cid, msg.pid, msg.mid)
    .then(function(){
        that.delete(msg.aid, msg.cid, msg.pid, msg.mid)
        .then(function(){
            MessageHistory.create(message)
            .then(function(msgs) {
                debug('Messages:Save success');
                d.resolve(msgs);
            }).catch(function(){
                d.reject({'error':'Messages:Save','errorCode':'MSG103'});
            });        
        }).catch(function(){
            d.reject({'error':'Messages:Save','errorCode':'MSG104'});
        });
    }).catch(function(){
        MessageHistory.create(message)
        .then(function(msgs) {
            debug('Messages:Save success');
            d.resolve(msgs);
        }).catch(function(err){
            debug('Messages:Save:error: %s', err);
            d.reject({'error':'Messages:Save','errorCode':'MSG105'});
        });
    });
    return d.promise;       
};

exports = module.exports = new Messages();