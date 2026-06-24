const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.get('/:userId', historyController.getHistory);
router.post('/add', historyController.addHistory);
router.delete('/clear/:userId', historyController.clearHistory);
module.exports = router;