var Sequelize = require('sequelize');

var sequelize = new Sequelize('postgresql://postgres:postgres@localhost:5432/chirpp');

exports = module.exports = sequelize;
