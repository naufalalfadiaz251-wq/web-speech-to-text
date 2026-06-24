const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

router.post('/update-xp', quizController.updateXp);
module.exports = router;