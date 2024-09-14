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
        // Inicializa o estado do usuário
        if (!userInteractions[to]) {
            userInteractions[to] = { hasInteracted: false };
        }
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

    // Verifica se o usuário já tem um estado registrado
    if (!userInteractions[From]) {
        userInteractions[From] = { hasInteracted: true }; // Marca o usuário como interagido
        responseMessage = 'Obrigado por entrar em contato! Por favor, escolha uma das opções abaixo:\n1. Opção 1\n2. Opção 2\n3. Opção 3';
    } else {
        const userInteraction = userInteractions[From];
        
        // Verifica se o usuário já interagiu antes
        if (!userInteraction.hasInteracted) {
            userInteraction.hasInteracted = true;
            responseMessage = 'Obrigado por entrar em contato! Por favor, escolha uma das opções abaixo:\n1. Opção 1\n2. Opção 2\n3. Opção 3';
        } else {
            // Processa a resposta do usuário
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
                    responseMessage = 'Opção inválida. Por favor, escolha 1, 2 ou 3.\n\nDigite "menu" para retornar ao menu principal.';
            }

            // Se a resposta for "menu", enviar o menu novamente
            if (Body.toLowerCase() === 'menu') {
                responseMessage = 'Obrigado por entrar em contato! Por favor, escolha uma das opções abaixo:\n1. Opção 1\n2. Opção 2\n3. Opção 3';
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
