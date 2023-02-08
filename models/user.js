const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    }
})

userSchema.plugin(passportLocalMongoose); //this is going to add username and password(as well as hash and salt field)to userSchema automatically

const User = mongoose.model('User', userSchema);


module.exports = User;