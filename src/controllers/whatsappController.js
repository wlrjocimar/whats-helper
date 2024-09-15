const messageService = require('../services/messageService');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

// Estrutura de dados em memória para gerenciar o estado dos usuários
const userInteractions = {};
const INACTIVITY_TIMEOUT = 60 * 60000; // 1h  em milissegundos


// Função para transcrever o áudio
async function transcribeAudio(audioUrl) {
    const audio = {
        uri: audioUrl, // URL do áudio enviado pelo WhatsApp
    };
    const config = {
        encoding: 'OGG_OPUS', // Formato do áudio que o WhatsApp utiliza para mensagens de voz
        sampleRateHertz: 16000,
        languageCode: 'pt-BR', // Definindo para português do Brasil
    };
    const request = {
        audio: audio,
        config: config,
    };

    const [response] = await client.recognize(request);
    const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    return transcription;
}

// Função para gerar QR Code com opções de configuração
async function generateQRCode(text) {
    try {
        // Gera o QR code em formato ASCII com configurações ajustadas
        const qrCodeASCII = await QRCode.toString(text, {
            type: 'terminal',
            errorCorrectionLevel: 'L', // Nível de correção de erro baixo
            scale: 1 // Ajuste a escala para reduzir o tamanho
        });
        return qrCodeASCII;
    } catch (error) {
        throw new Error('Erro ao gerar o QR Code: ' + error.message);
    }
}

// Função para reiniciar o atendimento se o usuário estiver inativo
function resetUserInteraction(userId) {
    if (userInteractions[userId]) {
        userInteractions[userId] = { hasInteracted: false, isTransferredToHuman: 0 };
    }
}

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
        await messageService.processMessage(menuMessage, to);
        // Inicializa o estado do usuário
        if (!userInteractions[to]) {
            userInteractions[to] = { 
                hasInteracted: false, 
                isTransferredToHuman: 0,
                lastInteraction: Date.now() // Adiciona timestamp da última interação
            };
        } else {
            // Atualiza timestamp da última interação
            userInteractions[to].lastInteraction = Date.now();
        }
        res.status(200).send('Menu enviado com sucesso!');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.receiveMessage = async (req, res) => {
    console.log("Dados do request*******", req.body);
    const { Body, From, ProfileName, Messages } = req.body;
    const userName = ProfileName;

    console.log("Usuario *********", userName);

    if (!userInteractions[From]) {
        userInteractions[From] = { 
            hasInteracted: false, 
            isTransferredToHuman: 0,
            lastInteraction: Date.now()
        };
    } else {
        userInteractions[From].lastInteraction = Date.now();
    }

    const userInteraction = userInteractions[From];
    let responseMessage = '';

    // Verifica se a mensagem recebida é um áudio
    if (Messages[0] && Messages[0].type === 'audio') {
        const audioUrl = Messages[0].audio.url;

        try {
            // Transcrever o áudio para texto
            const transcription = await transcribeAudio(audioUrl);
            console.log('Transcrição do áudio:', transcription);

            // Use a transcrição como o `Body` para processar a resposta
            responseMessage = `Você disse: ${transcription}`;

        } catch (error) {
            console.error('Erro ao transcrever o áudio:', error);
            responseMessage = 'Desculpe, não consegui entender o áudio. Por favor, tente novamente.';
        }
    } else {
        // Processar mensagem de texto ou outras interações
        if (Date.now() - userInteraction.lastInteraction > INACTIVITY_TIMEOUT) {
            resetUserInteraction(From);
            responseMessage = `Olá ${ProfileName}, escolha uma opção...`;
        } else if (userInteraction.isTransferredToHuman === 2) {
            responseMessage = null;
        } else if (userInteraction.isTransferredToHuman === 1) {
            responseMessage = `Seu atendimento foi transferido...`;
            userInteraction.isTransferredToHuman = 2;
        } else if (!userInteraction.hasInteracted) {
            userInteraction.hasInteracted = true;
            responseMessage = `Olá ${ProfileName}, escolha uma opção...`;
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
                case 'menu':
                    responseMessage = 'Menu principal: escolha uma opção...';
                    break;
                case 'ajuda':
                    responseMessage = 'Para ajuda, entre em contato com o suporte.';
                    break;
                case 'transferir':
                    userInteraction.isTransferredToHuman = 1;
                    responseMessage = `Seu atendimento foi transferido para um humano...`;
                    break;
                default:
                    responseMessage = 'Opção inválida. Digite "menu" para retornar.';
            }
        }
    }

    try {
        if (responseMessage) {
            await messageService.processMessage(responseMessage, From);
        }
        res.status(200).send('Resposta processada com sucesso!');
    } catch (error) {
        res.status(500).send(error.message);
    }
};
// Configura um intervalo para verificar inatividade dos usuários
setInterval(() => {
    const now = Date.now();
    for (const userId in userInteractions) {
        if (now - userInteractions[userId].lastInteraction > INACTIVITY_TIMEOUT) {
            resetUserInteraction(userId);
        }
    }
}, 60000); // Verifica a cada minuto
