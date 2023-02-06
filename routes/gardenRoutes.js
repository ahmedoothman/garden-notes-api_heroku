const express = require('express');
const gardenController = require('./../controllers/gardenController');
const authController = require('./../controllers/authController');
const router = express.Router();

router.use(authController.protect, gardenController.setUserId);
router
    .route('/')
    .post(
        gardenController.uploadGardenItemPhoto,
        gardenController.resizeGardenItemPhoto,
        gardenController.createGardenItem
    );
router.route('/myGarden').get(gardenController.getAllGardensUser);
router
    .route('/:id')
    .get(gardenController.getGardenItem)
    .patch(
        gardenController.uploadGardenItemPhoto,
        gardenController.resizeGardenItemPhoto,
        gardenController.updateGardenItem
    )
    .delete(gardenController.deleteGardenItem);

router
    .route('/')
    .get(authController.restrictTo('admin'), gardenController.getAllGardens);

module.exports = router;
