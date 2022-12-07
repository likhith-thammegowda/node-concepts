const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.set('useCreateIndex', true);

const userSchema = new Schema([{
    email: {
        type: String,
        lowercase: true
    },
    password: {
        type: String
    },
    created_At: {
        type: Date,
        default: Date.now
    },
}],
    { collection: 'User' },
    {
        versionKey: false
    })
const User = mongoose.model('user', userSchema);

module.exports = User;