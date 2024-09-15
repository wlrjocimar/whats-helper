const messageService = require('../services/messageService');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const speech = require('@google-cloud/speech');
require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const Twilio = require('twilio');
const grpc = require('@grpc/grpc-js');
grpc.setLogVerbosity(grpc.logVerbosity.DEBUG);
grpc.setLogger(console);

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

const auth = new GoogleAuth({
    credentials: credentials,
    projectId: credentials.project_id,
});
// Criar o cliente do Speech com as credenciais fornecidas
const client = new speech.SpeechClient({
    credentials: credentials,
    projectId: credentials.project_id,
});

// Estrutura de dados em memória para gerenciar o estado dos usuários
const userInteractions = {};
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora em milissegundos


//download do audio que foi para a twilio
async function downloadMedia(mediaUrl, outputPath) {
    try {
        const response = await axios({
            url: mediaUrl,
            method: 'GET',
            responseType: 'stream',
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            }
        });

        response.data.pipe(fs.createWriteStream(outputPath));
        return new Promise((resolve, reject) => {
            response.data.on('end', () => resolve(outputPath));
            response.data.on('error', (err) => reject(err));
        });
        console.log("Download do audio ok")
    } catch (error) {
        throw new Error('Erro ao baixar o arquivo de mídia: ' + error.message);
    }
}

//converter o audio para formato aceito pelo google
async function convertAudio(inputPath, outputPath) {

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec('flac') // Ou 'wav' se preferir
            .audioFilters('aformat=sample_fmts=s16:sample_rates=16000') // Define taxa de amostragem e formato
            .toFormat('flac') // Ou 'wav'
            .on('end', () => {
                console.log('Conversão de áudio concluída');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Erro na conversão de áudio:', err);
                reject(err);
            })
            .save(outputPath);
    });
}

// Função para transcrever áudio usando AssemblyAI
// Função para transcrever áudio usando AssemblyAI
async function transcribeAudioWithAssemblyAI(filePath, languageCode = 'pt') {
    try {
        // Lê o áudio e faz o upload para AssemblyAI
        const file = fs.readFileSync(filePath);
        const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload', file, {
            headers: {
                'authorization': process.env.ASSEMBLYAI_API_KEY,
                'content-type': 'audio/wav', // Ajuste o tipo de arquivo conforme necessário
            },
        });

        const audioUrl = uploadResponse.data.upload_url;

        // Inicia a transcrição
        const transcriptionResponse = await axios.post('https://api.assemblyai.com/v2/transcript', {
            audio_url: audioUrl,
            language_code: languageCode, // Código do idioma
        }, {
            headers: {
                'authorization': process.env.ASSEMBLYAI_API_KEY,
            },
        });

        const transcriptionId = transcriptionResponse.data.id;

        // Aguarda a transcrição ser concluída
        let result;
        do {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Atraso de 5 segundos
            const statusResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
                headers: {
                    'authorization': process.env.ASSEMBLYAI_API_KEY,
                },
            });
            result = statusResponse.data;
        } while (result.status !== 'completed' && result.status !== 'failed');

        if (result.status === 'completed') {
            const transcription = result.text;
            console.log(`Transcrição: ${transcription}`);
            return transcription;
        } else {
            throw new Error('Falha na transcrição.');
        }
    } catch (error) {
        console.error('Erro ao transcrever o áudio com AssemblyAI:', error);
        throw error;
    }
}


async function quickstart() {
    // Ler o conteúdo do arquivo WAV e converter para base64
    const audioContent = fs.readFileSync('converted_audio.wav').toString('base64');

    const audio = {
        content: audioContent,
    };
    const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
    };
    const request = {
        audio: audio,
        config: config,
    };

    try {
        // Detecta fala no arquivo de áudio
        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        console.log(`Transcription: ${transcription}`);
    } catch (error) {
        console.error('Erro ao transcrever:', error);
    }
}


//funcao para transcrever o audio
async function transcribeAudio(filePath) {
    const file = fs.readFileSync(filePath);
    const audioBytes = file.toString('base64');

    console.log('Audio bytes length:', audioBytes.length); // Log adicional

    const request = {
        audio: {
            content: audioBytes,
        },
        config: {
            encoding: 'FLAC', // Ou 'LINEAR16', dependendo do formato
            sampleRateHertz: 16000, // Atualizado para 16 kHz
            languageCode: 'pt-BR',
        },
    };

    try {
        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        console.log(`Transcrição: ${transcription}`);
        return transcription;
    } catch (error) {
        console.error('Erro ao transcrever o áudio:', error);
        throw error;
    }
}

// Função para gerar QR Code com opções de configuração
async function generateQRCode(text) {
    await quickstart();
    // try {
    //     // Gera o QR code em formato ASCII com configurações ajustadas
    //     const qrCodeASCII = await QRCode.toString(text, {
    //         type: 'terminal',
    //         errorCorrectionLevel: 'L', // Nível de correção de erro baixo
    //         scale: 1 // Ajuste a escala para reduzir o tamanho
    //     });
    //     return qrCodeASCII;
    // } catch (error) {
    //     throw new Error('Erro ao gerar o QR Code: ' + error.message);
    // }
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
    let { Body, From, ProfileName, MessageType, MediaUrl0 } = req.body;
    const userName = ProfileName;


    console.log("Usuario *********", userName);

    // Verifica se o usuário já tem um estado registrado
    if (!userInteractions[From]) {
        userInteractions[From] = {
            hasInteracted: false,
            isTransferredToHuman: 0,
            lastInteraction: Date.now() // Adiciona timestamp da última interação
        };
    } else {
        // Atualiza timestamp da última interação
        userInteractions[From].lastInteraction = Date.now();
    }

    const userInteraction = userInteractions[From];
    let responseMessage = '';

    // Verifica se a mensagem recebida é um áudio
    if (MessageType === 'audio') {


        try {
            // Baixar o arquivo de mídia
            const downloadedFilePath = await downloadMedia(MediaUrl0, 'downloaded_audio.mp3');

            // Converter o áudio
            const convertedFilePath = await convertAudio(downloadedFilePath, 'converted_audio.flac');

            // Transcrever o áudio
            //const transcription = await transcribeAudio(convertedFilePath);
            const transcription = await transcribeAudioWithAssemblyAI(convertedFilePath);
            console.log('Transcrição do áudio:', transcription);
            Body = transcription;

        } catch (error) {
            console.error('Erro ao transcrever o áudio:', error);
            responseMessage = 'Desculpe, não consegui entender o áudio. Por favor, tente novamente.';
        }
    }


    // Verifica se o usuário foi inativo por mais de 1hora 
    if (Date.now() - userInteraction.lastInteraction > INACTIVITY_TIMEOUT) {
        resetUserInteraction(From);
        responseMessage = `

 Olá    ${ProfileName}  
   
🌟 **Menu Principal** 🌟

Por favor, escolha uma das opções abaixo:

1️⃣ **Opção 1**: Descrição breve da Opção 1.
2️⃣ **Opção 2**: Descrição breve da Opção 2.
3️⃣ **Opção 3**: Descrição breve da Opção 3.

🔄 Se você precisar voltar ao menu principal a qualquer momento, digite *menu*.

❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
        `;
    } else {
        // Se o usuário foi transferido para atendimento humano
        if (userInteraction.isTransferredToHuman === 2) {
            // Se o usuário já foi transferido e notificado, não enviar mais mensagens automáticas
            responseMessage = null;
        } else if (userInteraction.isTransferredToHuman === 1) {
            // Se o usuário foi recentemente transferido e precisa ser notificado
            responseMessage = `
Seu atendimento foi transferido para um humano. Por favor, aguarde enquanto um atendente está disponível.

🔄 Se você precisar voltar ao menu principal a qualquer momento, digite *menu*.

❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
            `;
            // Marca como transferido e notificado
            userInteraction.isTransferredToHuman = 2;
        } else {
            // Se o usuário ainda não interagiu ou se está interagindo pela primeira vez
            if (!userInteraction.hasInteracted) {
                userInteraction.hasInteracted = true;
                responseMessage = `
Olá    ${ProfileName}
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
                console.log("Resposta do usuario", Body)
                // Função para verificar opções com base em palavras-chave
                const detectOption = (text) => {
                    if (/(\b1\b|\buno\b|\bum\b)/i.test(text)) {
                        return '1';
                    } else if (/(\b2\b|\bdois\b)/i.test(text)) {
                        return '2';
                    } else if (/(\b3\b|\btres\b)/i.test(text)) {
                        return '3';
                    } else if (/ajuda/i.test(text)) {
                        return 'ajuda';
                    } else if (/transferir/i.test(text)) {
                        return 'transferir';
                    } else {
                        return null;
                    }
                
            }
        };

        const option = detectOption(Body);

        // Processar a mensagem com base na opção detectada

        switch (option) {
            case '1':
                responseMessage = 'Você escolheu a Opção 1!';
                break;
            case '2':
                responseMessage = 'Você escolheu a Opção 2!';
                break;
            case '3':
                responseMessage = 'Você escolheu a Opção 3!';
                break;
            case 'ajuda':
                responseMessage = 'Para ajuda, entre em contato com o suporte.';
                break;
            case 'transferir':
                userInteraction.isTransferredToHuman = 1;
                responseMessage = `
                Seu atendimento foi transferido para um humano. Por favor, aguarde enquanto um atendente está disponível.
                
                🔄 Se você precisar voltar ao menu principal a qualquer momento, digite *menu*.
                
                ❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
                        `;
                break;
            default:
                // Usando expressão regular para capturar variações de "menu"
                if (/^m[e3]n?u$/i.test(Body)) {
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
                    responseMessage = `
                ❌ Opção inválida. Por favor, escolha 1, 2 ou 3.
                
                🔄 Para retornar ao menu principal, digite *menu*.
                
                ❓ Se tiver dúvidas ou precisar de ajuda, digite *ajuda*.
                            `;
                }
        }


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

exports.sendManualMessage = async (req, res) => {
    console.log("Mensagem manual", req.body);

    const { message, To } = req.body;
    if (!userInteractions[To]) {
        userInteractions[To] = { hasInteracted: true, isTransferredToHuman: 2 };
    } else {
        userInteractions[To].isTransferredToHuman = 2;
    }

    let responseMessage = message;

    try {
        await messageService.processMessage(responseMessage, To);
        res.status(200).send('Resposta processada com sucesso!');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// Função para enviar um botão
exports.sendButton = async (req, res) => {
    const { To } = req.body;

    // Gerar o QR code com a URL desejada
    const qrCodeText = 'https://bb.com.br';

    try {
        // Gera o QR code em formato ASCII e imprime no console
        const qrCodeASCII = await generateQRCode(qrCodeText);
        console.log('QR Code gerado:\n');
        console.log(qrCodeASCII);

        // Aqui, você pode criar e hospedar o QR Code em um servidor, se necessário
        // const qrCodeUrl = 'https://your-server.com/path-to-qrcode.png'; // Atualize com a URL correta

        // Exemplo de mensagem de botão
        const qrCodeMessage = {
            "recipient_type": "individual",
            "to": To,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {
                    "text": "Escaneie o QR Code abaixo:"
                },
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {
                                "id": "qr_code",
                                "title": "QR Code"
                            }
                        }
                    ],
                    // "media": { // Descomente se você estiver enviando uma URL de imagem
                    //     "type": "image",
                    //     "url": qrCodeUrl
                    // }
                }
            }
        };

        // Enviar a mensagem com o QR Code
        await messageService.sendInteractiveMessage(qrCodeMessage, To);
        res.status(200).send('QR Code enviado com sucesso!');
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
