const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../model/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const awsFeatures = require('./../utils/awsFeatures');
const dotenv = require('dotenv'); // to use environment variable
dotenv.config({ path: './config.env' }); // configuration of the environment file
const urlProduction = process.env.HOST_URL_FRONTEND;

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true, //cookie cannot be modified or accessed by the browser to prevent scripting attack
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; //when we use https
    res.cookie('jwt', token, cookieOptions);
    res.header('Access-Control-Expose-Headers', 'jwt');
    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const email = req.body.email;
    const user = await User.findOne({ email });
    if (user) {
        return next(new AppError('This email is used before ', 400));
    }
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
    });

    const verifyToken = await newUser.createAccountVerifyToken();
    await newUser.save({ validateBeforeSave: false });

    const verifyURL = `${urlProduction}/verify-email/${verifyToken}`;
    //const message = `please verify your email by visiting this link ${verifyURL}`;
    try {
        new sendEmail(
            { email: newUser.email, name: newUser.name },
            verifyURL
        ).verifyEmail();

        res.status(200).json({
            status: 'success',
            message: 'verify token sent to email',
        });
    } catch (err) {
        newUser.accountverifyToken = undefined;
        await newUser.save({ validateBeforeSave: false });

        return next(
            new AppError(
                'there was an error sending the email. try again later!'
            ),
            500
        );
    }

    //createSendToken(newUser, 201, res);
});
exports.verifyEmail = catchAsync(async (req, res, next) => {
    //1) find user by token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({ accountVerifyToken: hashedToken });

    //2) check if user is already verified
    if (!user) {
        return next(new AppError('your email is already verified!', 400));
    }
    //3) Verifiy account
    user.verified = true;
    user.accountVerifyToken = undefined;
    await user.save({ validateBeforeSave: false });
    //4) response success
    res.status(200).json({
        status: 'success',
        message: 'your account is verified',
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }
    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        return next(new AppError('Incorrect email or password', 401));
    }
    const correct = await user.correctPassword(password, user.password);

    if (!user || !correct) {
        return next(new AppError('Incorrect email or password', 401));
    }

    //3) check if the email is verified
    if (!user.verified) {
        return next(new AppError('Your email is not verified', 401));
    }

    // 4) If everything ok, send token to client
    createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
    //1) get Token
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(
            new AppError(
                'You are not logged in! Please log in to get access.',
                401
            )
        );
    }

    //2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //3) Check if user still exists
    let currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(
            new AppError(
                'The user belonging to this token no longer exists.',
                401
            )
        );
    }

    //4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                'User recently changed password! Please log in again.',
                401
            )
        );
    }
    // give secured link for the image
    if (!currentUser.photo.startsWith('https')) {
        currentUser.photo = awsFeatures.getSignedUrlAws(currentUser.photo);
    }
    // Grant Access
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perform this action',
                    403
                )
            );
        }
        next();
    };
};

exports.updatePassword = catchAsync(async (req, res, next) => {
    //1) get user
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
        return next(new AppError('There is no user with that id.', 404));
    }

    //2 check  current password
    const correctPass = await user.correctPassword(
        req.body.passwordCurrent,
        user.password
    );
    if (!correctPass) {
        return next(new AppError('Current password is not correct', 401));
    }
    //3 update user
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    //4 log user in
    createSendToken(user, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1) get user by email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('there is no user wit that email', 404));
    }
    //2) Generate random reset token
    const resetToken = await user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    //3)send it to user email
    const resetURL = `${urlProduction}/reset-password/${resetToken}`;
    //  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    try {
        new sendEmail(
            { email: user.email, name: user.name },
            resetURL
        ).sendResetPassword();

        res.status(200).json({
            status: 'success',
            message: 'token sent to email',
        });
    } catch (err) {
        user.PasswordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                'there was an error sending the email. try again later!'
            ),
            500
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    //1) hash token and get user
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    //2) check if user exists or token has expired
    if (!user) {
        return next(new AppError('token is expired or invalid', 400));
    }
    //console.log(req.body.password);
    //3) update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    //4)log user in
    createSendToken(user, 200, res);
});
