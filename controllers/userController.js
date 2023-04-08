const User = require('./../model/userModel');
const catchAsync = require('./../utils/catchAsync');
const email = require('./../utils/email');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

let hostUrlFrontEnd = process.env.HOST_URL_FRONTEND;
/* Aws */
const awsFeatures = require('./../utils/awsFeatures');

const multerStorage = multer.memoryStorage(); // save image as buffer

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only image', 400), false);
    }
};
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();
    //user-id-current-timestamp.jpeg
    const filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    const filepathAws = `img/users/${filename}`;
    /*     await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`img/users/${req.file.filename}`);
 */
    // get image file
    const imageFile = await sharp(req.file.buffer)
        .resize(600, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer();
    // upload image to aws s3
    const imgeAwsUrl = await awsFeatures.uploadAwsAndGetSignedURL(
        imageFile,
        filepathAws
    );
    req.awsSignedUrl = imgeAwsUrl;
    //save the path to db
    req.file.filename = `${filepathAws}`; // for aws
    /* ******************************* */

    next();
});
const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates. Please use /updateMyPassword.',
                400
            )
        );
    }

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
    let nameChanged = false;
    let emailChanged = false;

    if (req.file) filteredBody.photo = req.file.filename;
    if (req.body.name) nameChanged = true;
    if (req.body.email) {
        emailChanged = true;
        filteredBody.verified = false;
    }

    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    );

    if (nameChanged) {
        try {
            new email(
                { name: updatedUser.name, email: updatedUser.email },
                'url'
            ).sendNameChanged();
        } catch (error) {
            return next(
                new AppError(
                    'there was an error sending the email. try again later!'
                ),
                500
            );
        }
    }
    if (emailChanged) {
        const verifyToken = await updatedUser.createAccountVerifyToken();
        await updatedUser.save({ validateBeforeSave: false });

        const verifyURL = `${hostUrlFrontEnd}/${verifyToken}`;
        //const message = `please verify your email by visiting this link ${verifyURL}`;
        try {
            new email(
                { email: updatedUser.email, name: updatedUser.name },
                verifyURL
            ).verifyEmail();
        } catch (err) {
            updatedUser.accountverifyToken = undefined;
            await updatedUser.save({ validateBeforeSave: false });

            return next(
                new AppError(
                    'there was an error sending the email. try again later!'
                ),
                500
            );
        }
    }
    let exposedBody = updatedUser;
    if (!exposedBody.photo.startsWith('https')) {
        exposedBody.photo = awsFeatures.getSignedUrlAws(exposedBody.photo);
    }
    if (emailChanged) {
        res.status(200).json({
            status: 'success',
            message: 'Please Visit Your Email to Verify it',
            data: {
                user: exposedBody,
            },
        });
    } else {
        res.status(200).json({
            status: 'success',
            message: 'Updated Successfully',
            data: {
                user: exposedBody,
            },
        });
    }
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
        data: null,
    });
});

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not defined! Please use /signup instead',
    });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
