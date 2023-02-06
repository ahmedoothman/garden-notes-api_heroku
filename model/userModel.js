const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'User must have a name '],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'User must have a email '],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'please provide a valid email'],
    },
    photo: {
        type: String,
        default:
            'https://firebasestorage.googleapis.com/v0/b/garden-notes.appspot.com/o/users%2Fdefault.jpeg?alt=media&token=d3fece35-d143-4d64-9a04-051af4532e92',
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'please Provide a password'],
        minlength: 8,
        select: false, //not shown in response
    },
    passwordConfirm: {
        type: String,
        required: [true, 'please confirm your password'],
        validate: {
            validator: function (el) {
                return el === this.password;
            },
            message: 'passwords are not the same',
        },
        //select:false
    },
    passwordChangedAt: {
        type: Date,
        required: [false],
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    accountVerifyToken: String,
    active: {
        type: Boolean,
        default: true,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    accountCreatedAt: {
        type: Date,
        required: [false],
        default: new Date(),
    },
});

//hash password when creating or updating user we know that because the password is modified
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
        this.passwordConfirm = undefined;
        next();
    } else {
        return next();
    }
});

//add the date of the cahnged password
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } });
    next();
});

//methods to the schema we need

userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );

        return JWTTimestamp < changedTimestamp;
    }

    // False means NOT changed
    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    //console.log({ resetToken }, this.passwordResetToken);

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //expires in 10 mins

    return resetToken;
};

userSchema.methods.createAccountVerifyToken = function () {
    const verifyToken = crypto.randomBytes(32).toString('hex');
    this.accountVerifyToken = crypto
        .createHash('sha256')
        .update(verifyToken)
        .digest('hex');
    return verifyToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
