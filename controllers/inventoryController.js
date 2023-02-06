const Inventory = require('./../model/inventoryItemModel');
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
exports.uploadInventoryItemPhoto = upload.single('photo');
exports.resizeInventoryItemPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();
    //user-id-current-timestamp.jpeg
    const filename = `inventory-${req.user.id}-${Date.now()}.jpeg`;
    const filepathAws = `img/inventoryItem/${filename}`;
    // await sharp(req.file.buffer)
    //     .resize(600, 500)
    //     .toFormat('jpeg')
    //     .jpeg({ quality: 90 })
    //     .toFile(`img/inventoryItem/${req.file.filename}`);

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
    //save the link to db
    req.file.filename = `${imgeAwsUrl}`; // for aws
    next();
});
exports.getAllInventoryUser = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(
        Inventory.find({ user: req.body.user }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const inventory = await features.query;
    res.status(200).json({
        status: 'success',
        results: inventory.length,
        data: {
            data: inventory,
        },
    });
});
exports.deleteInventoryItem = catchAsync(async (req, res, next) => {
    const doc = await Inventory.deleteOne({
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

exports.getAllInventory = factory.getAll(Inventory);
exports.getInventoryItem = factory.getOne(Inventory);
exports.updateInventoryItem = factory.updateOne(Inventory);
exports.createInventoryItem = factory.createOne(Inventory);
