
require('dotenv').config(); // Carrega variáveis de ambiente
const axios =require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID; // Do .env
const authToken = process.env.TWILIO_AUTH_TOKEN;   // Do .env
const client = require('twilio')(accountSid, authToken);

const sendMenu = async (toNumber) => {

    console.log("destinatario to : ", toNumber)
    const menuBody = `
    Olá! Escolha uma das opções abaixo:
    1. Opção 1
    2. Opção 2
    3. Opção 3
    Responda com o número da opção desejada.
    `;

    try {
        const message = await client.messages.create({
            body: menuBody, // Conteúdo da mensagem com o menu
            from: process.env.TWILIO_WHATSAPP_NUMBER, // Número do Twilio
            to: toNumber // Número do destinatário
        });
        return `Menu enviado com sucesso! SID: ${message.sid}`; // Retorne a resposta
    } catch (error) {
        console.error(`Erro ao enviar o menu: ${error.message}`);
        throw new Error(`Erro ao enviar o menu: ${error.message}`);
    }
};

const processMessage = async (messageBody, toNumber) => {
    try {
        const message = await client.messages.create({
            body: messageBody, // Conteúdo da mensagem
            from: process.env.TWILIO_WHATSAPP_NUMBER, // Número do Twilio
            to: toNumber // Número do destinatário
        });
        return `Mensagem enviada com sucesso! SID: ${message.sid}`; // Retorne a resposta
    } catch (error) {
        console.error(`Erro ao enviar a mensagem: ${error.message}`);
        throw new Error(`Erro ao enviar a mensagem: ${error.message}`);
    }
};


const processMessageOfficialAPI = async (messageBody, toNumber) => {
    const toNumberStr = `${toNumber}`; // Garantir que toNumber seja uma string

    console.log("Processando envio automático de mensagem para o destinatário:", toNumberStr);
    
    try {
        // Envia a requisição para o servidor que processa a mensagem
        const chatPassadoResponse = await axios({
            url: 'http://inovaestudios.com.br:8093/flexybot-api/chat',
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                mensagem: messageBody
            })
        });

        // Se a requisição for bem-sucedida, a resposta virá com a mensagem processada
        const processedMessage = chatPassadoResponse.data.resposta || messageBody; // Usar a resposta ou a mensagem original

        console.log("Mensagem processada retornada do chat gpt",processedMessage)

        // Agora envia a mensagem via WhatsApp com a resposta recebida
        const whatsappResponse = await axios({
            url: `https://graph.facebook.com/v21.0/${process.env.ID_ORIGIN_PHONE}/messages`,
            method: 'post',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_APP}`,
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                messaging_product: 'whatsapp',
                to: toNumberStr, // Número de telefone do destinatário
                type: 'text',
                text: {
                    body: processedMessage
                }
            })
        });

        // Log da resposta da API (para debugar, se necessário)
        // console.log("Resposta da API do WhatsApp:", whatsappResponse.data);

    } catch (error) {
        console.error("Erro ao enviar a mensagem:", error);
    }
};


const sendInteractiveMessage = async (messageBody, toNumber) => {
    
    try {
        const message = await client.messages.create({
            body: JSON.stringify(messageBody), // Conteúdo da mensagem
            from: process.env.TWILIO_WHATSAPP_NUMBER, // Número do Twilio
            to: toNumber // Número do destinatário
        });
        return `Mensagem enviada com sucesso! SID: ${message.sid}`; // Retorne a resposta
    } catch (error) {
        console.error(`Erro ao enviar a mensagem: ${error.message}`);
        throw new Error(`Erro ao enviar a mensagem: ${error.message}`);
    }
};


module.exports = {
    sendMenu,
    processMessage,
    sendInteractiveMessage,
    processMessageOfficialAPI
};
