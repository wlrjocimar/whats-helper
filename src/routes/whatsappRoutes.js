const express = require('express');
const whatsappController = require('../controllers/whatsappController');
const router = express.Router();

router.post('/receive', whatsappController.sendManualMessage);

// Rota para enviar o menu
router.post('/send-menu', whatsappController.sendMenu);

// Rota para receber e processar mensagens twilio
//router.post('/webhook', whatsappController.receiveMessage);

// Rota para receber e processar mensagens api oficial
router.get('/webhook', whatsappController.receiveMessageOfficialApi);

// Rota para receber e processar mensagens api oficial
router.post('/webhook', whatsappController.receiveMessageOfficialApiPost);


// Nova rota para enviar um botão
router.post('/send-button', whatsappController.sendButton);

// Rota para enviar template de mensagem usando api oficial do whatsapp
router.post('/send-message',whatsappController.sendMessageTemplate)

// Rota para enviar mensagem type text de mensagem usando api oficial do whatsapp
router.post('/send-text',whatsappController.sendTextMessage)

// Rota para enviar mensagem type media de mensagem usando api oficial do whatsapp
router.post('/send-media',whatsappController.sendMediaMessage)

// Rota para enviar mensagem type media uploaded de mensagem usando api oficial do whatsapp
router.post('/send-upload-media',whatsappController.sendUploadMediaMessage)





module.exports = router;
