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
    console.log("Precessar envio automatico de mensagem para o destinatario",toNumber)
    

    const response = await axios({
        url:'https://graph.facebook.com/v21.0/527299920456814/messages',
        method:'post',
        headers:{
            'Authorization':`Bearer ${process.env.WHATSAPP_APP}`,
            'Content-Type':'application/json',



        },
        data:JSON.stringify({
            messaging_product:'whatsapp',
            to:toNumber,
            type:'text',
            text:{
                body:messageBody
                
            }


        })

       
    })
    
    console.log(response.data);

    res.send(response.data);
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
