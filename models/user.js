const mongoose = require('mongoose');

const Schema = mongoose.Schema;

var UsersSchema = new Schema({
    name: String,
    age: Number,
    file: String,
    createAt: Date,
    updateAt: Date
});

UsersSchema.index({'$**': 'text'});

module.exports = mongoose.model('Users', UsersSchema);