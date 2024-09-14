const messageService = require('../services/messageService');

// Estrutura de dados em memória para gerenciar o estado dos usuários
const userInteractions = {};

exports.sendMenu = async (req, res) => {
    const { to } = req.body;
    console.log("Body", req.body);
    console.log("tooooo", to);

    try {
        // Envia o menu para o usuário
        const responseMessage = await messageService.sendMenu(to);
        res.status(200).send(responseMessage);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.receiveMessage = async (req, res) => {
    console.log("Dados do request*******", req.body);
    const { Body, From } = req.body;
    console.log("cheguei");
    
    let responseMessage = '';

    // Inicializa o estado do usuário se não existir
    if (!userInteractions[From]) {
        userInteractions[From] = { hasInteracted: false };
        responseMessage = 'Obrigado por entrar em contato! Por favor, escolha uma das opções abaixo:\n1. Opção 1\n2. Opção 2\n3. Opção 3';
    } else {
        const userInteraction = userInteractions[From];
        
        if (!userInteraction.hasInteracted) {
            userInteraction.hasInteracted = true;
            responseMessage = 'Obrigado por entrar em contato! Por favor, escolha uma das opções abaixo:\n1. Opção 1\n2. Opção 2\n3. Opção 3';
        } else {
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
        }
    }

    try {
        await messageService.processMessage(responseMessage, From);
        res.status(200).send('Resposta processada com sucesso!');
    } catch (error) {
        res.status(500).send(error.message);
    }
};
