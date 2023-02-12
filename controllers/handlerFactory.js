const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const awsFeatures = require('./../utils/awsFeatures');
const moment = require('moment');
exports.deleteOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const intilDoc = await Model.findById(req.params.id);
        if (!intilDoc) {
            return next(new AppError('No document found with that ID', 404));
        } else {
            if (!intilDoc.photo.startsWith('https'))
                await awsFeatures.deleteAwsFile(intilDoc.photo);
        }
        const doc = await Model.findByIdAndDelete(req.params.id);

        res.status(204).json({
            status: 'success',
            data: null,
        });
    });

exports.updateOne = (Model) =>
    catchAsync(async (req, res, next) => {
        if (req.file) req.body.photo = req.file.filename;
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true, //this return document after update
            runValidators: true,
        });

        if (!doc) {
            return next(new AppError('No document found with that ID', 404));
        }
        req.body = doc;
        let newDoc = doc;
        if (!newDoc.photo.startsWith('https')) {
            newDoc.photo = req.awsSignedUrl;
        }
        res.status(200).json({
            status: 'success',
            data: {
                data: newDoc,
            },
        });
    });

exports.createOne = (Model) =>
    catchAsync(async (req, res, next) => {
        if (!req.body.user) req.body.user = req.user.id;
        req.body.user.buyDate = moment(
            req.body.user.buyDate,
            'DD-MM-YYYY'
        ).format('MM-DD-YYYY');
        if (req.file) req.body.photo = req.file.filename;
        const doc = await Model.create(req.body);
        req.body = doc;
        let newDoc = doc;
        if (!newDoc.photo.startsWith('https')) {
            newDoc.photo = req.awsSignedUrl;
        }
        res.status(201).json({
            status: 'success',
            data: {
                data: newDoc,
            },
        });
    });

exports.getOne = (Model, popOptions) =>
    catchAsync(async (req, res, next) => {
        let query = Model.findById(req.params.id);
        if (popOptions) query = query.populate(popOptions);
        const doc = await query;

        if (!doc) {
            return next(new AppError('No document found with that ID', 404));
        }
        // related to aws
        let newDoc = doc;
        if (!doc.photo.startsWith('https')) {
            newDoc.photo = awsFeatures.getSignedUrlAws(doc.photo);
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: newDoc,
            },
        });
    });

exports.getAll = (Model) =>
    catchAsync(async (req, res, next) => {
        // To allow for nested GET reviews on tour (hack)
        let filter = {};
        if (req.params.tourId) filter = { tour: req.params.tourId };

        const features = new APIFeatures(Model.find(filter), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();
        // const doc = await features.query.explain();
        const doc = await features.query;
        let newDocs;
        newDocs = doc.map((el) => {
            if (!el.photo.startsWith('https')) {
                el.photo = awsFeatures.getSignedUrlAws(el.photo);
            }
            return el;
        });
        res.status(200).json({
            status: 'success',
            results: doc.length,
            data: {
                data: newDocs,
            },
        });
    });
