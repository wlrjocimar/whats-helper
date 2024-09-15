const express = require('express');
const whatsappController = require('../controllers/whatsappController');
const router = express.Router();

router.post('/receive', whatsappController.sendManualMessage);

// Rota para enviar o menu
router.post('/send-menu', whatsappController.sendMenu);

// Rota para receber e processar mensagens
router.post('/webhook', whatsappController.receiveMessage);

// Nova rota para enviar um botão
router.post('/send-button', whatsappController.sendButton);

module.exports = router;
