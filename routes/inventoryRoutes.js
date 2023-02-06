const express = require('express');

const inventoryController = require('../controllers/inventoryController');
const authController = require('../controllers/authController');
const router = express.Router();

router.use(authController.protect, inventoryController.setUserId);
router
    .route('/')
    .post(
        inventoryController.uploadInventoryItemPhoto,
        inventoryController.resizeInventoryItemPhoto,
        inventoryController.createInventoryItem
    );
router.route('/myGarden').get(inventoryController.getAllInventoryUser);
router
    .route('/:id')
    .get(inventoryController.getInventoryItem)
    .patch(
        inventoryController.uploadInventoryItemPhoto,
        inventoryController.resizeInventoryItemPhoto,
        inventoryController.updateInventoryItem
    )
    .delete(inventoryController.deleteInventoryItem);

router
    .route('/')
    .get(
        authController.restrictTo('admin'),
        inventoryController.getAllInventory
    );

module.exports = router;
