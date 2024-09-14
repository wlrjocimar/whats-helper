const messageService = require('../services/messageService');

// Estrutura de dados em memória para gerenciar o estado dos usuários
const userInteractions = {};

exports.sendMenu = async (req, res) => {
    const { to } = req.body;
    console.log("Body", req.body);
    console.log("tooooo", to);

    const menuMessage = `
🌟 **Menu Principal** 🌟

Por favor, escolha uma das opções abaixo:

1️⃣ **Opção 1**: Descrição breve da Opção 1.
2️⃣ **Opção 2**: Descrição breve da Opção 2.
3️⃣ **Opção 3**: Descrição breve da Opção 3.

🔄 Se você precisar voltar ao menu principal a qualquer momento, digite *menu*.

❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
    `;

    try {
        // Envia o menu estilizado para o usuário
        await messageService.processMessage(menuMessage,to );
        // Inicializa o estado do usuário
        if (!userInteractions[to]) {
            userInteractions[to] = { hasInteracted: false };
        }
        res.status(200).send('Menu enviado com sucesso!');
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
        responseMessage = `
🌟 **Menu Principal** 🌟

Por favor, escolha uma das opções abaixo:

1️⃣ **Opção 1**: Descrição breve da Opção 1.
2️⃣ **Opção 2**: Descrição breve da Opção 2.
3️⃣ **Opção 3**: Descrição breve da Opção 3.

🔄 Se você precisar voltar ao menu principal a qualquer momento, digite *menu*.

❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
        `;
    } else {
        const userInteraction = userInteractions[From];
        
        // Verifica se o usuário já interagiu antes
        if (!userInteraction.hasInteracted) {
            userInteraction.hasInteracted = true;
            responseMessage = `
🌟 **Menu Principal** 🌟

Por favor, escolha uma das opções abaixo:

1️⃣ **Opção 1**: Descrição breve da Opção 1.
2️⃣ **Opção 2**: Descrição breve da Opção 2.
3️⃣ **Opção 3**: Descrição breve da Opção 3.

🔄 Se você precisar voltar ao menu principal a qualquer momento, digite *menu*.

❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
            `;
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
                case 'menu':
                    responseMessage = `
🌟 **Menu Principal** 🌟

Por favor, escolha uma das opções abaixo:

1️⃣ **Opção 1**: Descrição breve da Opção 1.
2️⃣ **Opção 2**: Descrição breve da Opção 2.
3️⃣ **Opção 3**: Descrição breve da Opção 3.

🔄 Se você precisar voltar ao menu principal a qualquer momento, digite *menu*.

❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
                    `;
                    break;
                case 'ajuda':
                    responseMessage = 'Para ajuda, entre em contato com o suporte.';
                    break;
                default:
                    responseMessage = `
❌ Opção inválida. Por favor, escolha 1, 2 ou 3.

🔄 Para retornar ao menu principal, digite *menu*.

❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
                    `;
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


exports.sendManualMessage = async (req, res) => {
    console.log("Mensagem manual", req.body);
    const { Body, To } = req.body;
    console.log("cheguei");
    
    let responseMessage = req.body;

    

    try {
        await messageService.processMessage(responseMessage, To);
        res.status(200).send('Resposta processada com sucesso!');
    } catch (error) {
        res.status(500).send(error.message);
    }
};
