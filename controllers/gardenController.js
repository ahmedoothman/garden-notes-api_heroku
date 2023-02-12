const Garden = require('./../model/gardenItemModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');
const multer = require('multer');
const sharp = require('sharp');

/* Aws */
const awsFeatures = require('./../utils/awsFeatures');

exports.setUserId = (req, res, next) => {
    if (!req.body.user) req.body.user = req.user.id;
    next();
};
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
exports.uploadGardenItemPhoto = upload.single('photo');

exports.resizeGardenItemPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();
    //user-id-current-timestamp.jpeg
    const filename = `plant-${req.user.id}-${Date.now()}.jpeg`;
    const filepathAws = `img/gardenItem/${filename}`;
    // req.file.filename = `${hostUrl}/${filepath}`; // for local or bought server

    // noraml operation
    // await sharp(req.file.buffer)
    //     .resize(600, 500)
    //     .toFormat('jpeg')
    //     .jpeg({ quality: 90 })
    //     .toFile(filepath);

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
    // save the link in the req object to access it in the next middleware
    req.awsSignedUrl = imgeAwsUrl;
    //save the path to db
    req.file.filename = `${filepathAws}`; // for aws
    next();
});

exports.getAllGardensUser = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(
        Garden.find({ user: req.body.user }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const gardens = await features.query;
    let newGardens;
    newGardens = gardens.map((el) => {
        if (!el.photo.startsWith('https')) {
            el.photo = awsFeatures.getSignedUrlAws(el.photo);
        }
        return el;
    });
    res.status(200).json({
        status: 'success',
        results: gardens.length,
        data: {
            data: newGardens,
        },
    });
});

exports.getAllGardens = factory.getAll(Garden);
exports.getGardenItem = factory.getOne(Garden);

exports.updateGardenItem = factory.updateOne(Garden);
exports.createGardenItem = factory.createOne(Garden);
exports.deleteGardenItem = catchAsync(async (req, res, next) => {
    const intilDoc = await Inventory.findById(req.params.id);
    if (!intilDoc) {
        return next(new AppError('No document found with that ID', 404));
    } else {
        if (!intilDoc.photo.startsWith('https'))
            await awsFeatures.deleteAwsFile(intilDoc.photo);
    }
    const doc = await Garden.deleteOne({
        _id: req.params.id,
        user: req.user.id,
    });
    if (doc.deletedCount <= 0) {
        return next(new AppError('No document found with that ID', 404));
    }
    res.status(204).json({
        status: 'success',
        data: null,
    });
});
