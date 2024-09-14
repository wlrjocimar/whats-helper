const messageService = require('../services/messageService');

exports.sendMenu = async (req, res) => {
    const { to } = req.body;
    console.log("Body",req.body)
    console.log("tooooo",to)
    try {
        const responseMessage = await messageService.sendMenu(to);
        res.status(200).send(responseMessage);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.receiveMessage = async (req, res) => {
    console.log("Dados do request*******",req)
    const { Body, To } = req.body;
    console.log("cheguei")
    let responseMessage = '';
    
    switch (Body) {
        case '1':
            responseMessage = 'Você escolheu a Opção 1!';
            break;
        case '2':
            responseMessage = 'Você escolheu a Opção 2!';
            break;
        case '3':
            responseMessage = 'Você escolheu a Opção 3!';
            break;
        default:
            responseMessage = 'Opção inválida. Por favor, escolha 1, 2 ou 3.';
    }

    try {
        await messageService.processMessage(responseMessage, To);
        res.status(200).send('Resposta processada com sucesso!');
    } catch (error) {
        res.status(500).send(error.message);
    }
};
