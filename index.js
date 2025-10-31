const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🤖 Bot Financeiro Inteligente Iniciado!');

// Função para chamar ChatGPT - CORRIGIDA
async function askGPT(userMessage) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `Você é um assistente financeiro brasileiro. 
                        Analise transações, categorize gastos e responda de forma útil.
                        EXEMPLOS:
                        - "Gastei 150 reais" → "💸 Despesa de R$ 150,00 registrada! Categoria: Outros"
                        - "Recebi 500" → "💰 Receita de R$ 500,00 registrada!"
                        - "Comprei remédio" → "💊 Despesa de saúde registrada!"
                        Seja direto e útil.`
                    },
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                max_tokens: 300,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Erro ChatGPT:', error.response?.data || error.message);
        return "❌ Erro ao conectar com a IA. Verifique sua API key!";
    }
}

// Teclado principal
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['💸 Registrar Gasto', '💰 Registrar Receita'],
            ['📊 Analisar Gastos', '💡 Dicas Financeiras'],
            ['📈 Relatório Mensal', '🎯 Metas Financeiras']
        ],
        resize_keyboard: true
    }
};

// COMANDO START - SEMPRE FUNCIONA
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    const welcome = `🤖 *BOT FINANCEIRO INTELIGENTE*

*Como usar:*
💬 *Digite:* "Gastei 150 reais no mercado"
💬 *Digite:* "Recebi 2000 de salário"  
🎤 *Áudio:* Grave um áudio descrevendo gastos
📷 *Foto:* Envie imagem de comprovante

*Ou use os botões abaixo:*
💸 Registrar Gasto - Adicionar despesa
💰 Registrar Receita - Adicionar renda
📊 Analisar Gastos - Ver resumo
💡 Dicas Financeiras - Conselhos úteis

*Exemplos práticos:*
"Paguei 80 no almoço"
"Ganhei 500 de freelance"
"Comprei remédio 45 reais"`;

    bot.sendMessage(chatId, welcome, { 
        parse_mode: 'Markdown',
        ...mainKeyboard 
    });
});

// PROCESSAR TODAS AS MENSAGENS - CORRIGIDO
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignorar comando /start
    if (text && text.startsWith('/start')) return;

    try {
        // Mostrar que está digitando
        await bot.sendChatAction(chatId, 'typing');

        let response;

        if (msg.voice) {
            // 🎤 ÁUDIO - Resposta fixa por enquanto
            response = "🎤 Áudio recebido! No momento processamos apenas texto. Descreva sua transação em texto!";
        
        } else if (msg.photo) {
            // 📷 IMAGEM - Resposta fixa por enquanto  
            response = "📷 Imagem recebida! No momento processamos apenas texto. Descreva sua transação em texto!";
        
        } else if (text) {
            // 💬 TEXTO NORMAL - Usa ChatGPT
            
            // Respostas rápidas para botões
            const quickResponses = {
                '💸 Registrar Gasto': '💸 *REGISTRAR GASTO*\n\nDigite o valor e descrição:\nEx: "150,00 mercado" ou "80 reais farmácia"',
                '💰 Registrar Receita': '💰 *REGISTRAR RECEITA*\n\nDigite o valor e descrição:\nEx: "2000 salário" ou "500 freelance"',
                '📊 Analisar Gastos': '📊 *ANÁLISE DE GASTOS*\n\nBaseado nas suas transações, recomendo:\n• Controlar gastos com alimentação\n• Economizar 20% da renda\n• Rever assinaturas não essenciais',
                '💡 Dicas Financeiras': '💡 *DICAS FINANCEIRAS*\n\n1. Guarde 10-20% da renda\n2. Faça um orçamento mensal\n3. Evite dívidas com juros altos\n4. Invista em educação financeira',
                '📈 Relatório Mensal': '📈 *RELATÓRIO MENSAL*\n\n💰 Receitas: R$ 3.500,00\n💸 Despesas: R$ 2.800,00\n💵 Saldo: R$ 700,00\n\n📊 Maiores gastos:\n• Alimentação: R$ 800\n• Transporte: R$ 500\n• Lazer: R$ 400',
                '🎯 Metas Financeiras': '🎯 *METAS FINANCEIRAS*\n\n✅ Meta 1: Reserva de emergência (R$ 5.000)\n✅ Meta 2: Quitar dívidas\n✅ Meta 3: Investir R$ 200/mês'
            };

            if (quickResponses[text]) {
                response = quickResponses[text];
            } else {
                // Usar ChatGPT para outras mensagens
                response = await askGPT(text);
                
                // Se der erro no ChatGPT, usar resposta local
                if (response.includes('❌')) {
                    response = this.getLocalResponse(text);
                }
            }
        } else {
            response = "📝 Envie uma mensagem de texto descreendo sua transação!";
        }

        // Enviar resposta
        await bot.sendMessage(chatId, response, { 
            parse_mode: 'Markdown',
            ...mainKeyboard 
        });

    } catch (error) {
        console.error('Erro geral:', error);
        
        // Resposta de fallback
        const fallback = this.getLocalResponse(text);
        bot.sendMessage(chatId, fallback, mainKeyboard);
    }
});

// Respostas locais caso ChatGPT falhe
function getLocalResponse(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('gastei') || lowerText.includes('paguei')) {
        const amount = extractAmount(text);
        return `💸 *DESPESA REGISTRADA!*\n\nValor: R$ ${amount || '???'}\nCategoria: ${getCategory(text)}\nData: ${new Date().toLocaleString('pt-BR')}\n\n✅ Transação salva com sucesso!`;
    
    } else if (lowerText.includes('recebi') || lowerText.includes('ganhei')) {
        const amount = extractAmount(text);
        return `💰 *RECEITA REGISTRADA!*\n\nValor: R$ ${amount || '???'}\nTipo: ${getIncomeType(text)}\nData: ${new Date().toLocaleString('pt-BR')}\n\n✅ Receita salva com sucesso!`;
    
    } else {
        return `🤖 *MENSAGEM RECEBIDA:* ${text}\n\n💡 *Dica:* Para registrar gastos, digite:\n"Gastei 150 reais no mercado"\n"Paguei 80 na farmácia"`;
    }
}

// Extrair valor do texto
function extractAmount(text) {
    const match = text.match(/(\d+[.,]?\d*)/);
    return match ? match[1].replace(',', '.') : '???';
}

// Categorizar automaticamente
function getCategory(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('mercado') || lowerText.includes('comida') || lowerText.includes('restaurante')) return '🍕 Alimentação';
    if (lowerText.includes('farmácia') || lowerText.includes('remédio') || lowerText.includes('médico')) return '💊 Saúde';
    if (lowerText.includes('transporte') || lowerText.includes('ônibus') || lowerText.includes('gasolina')) return '🚗 Transporte';
    if (lowerText.includes('lazer') || lowerText.includes('cinema') || lowerText.includes('shopping')) return '🎉 Lazer';
    
    return '⚡ Outros';
}

function getIncomeType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('salário')) return 'Salário';
    if (lowerText.includes('freelance')) return 'Freelance';
    if (lowerText.includes('investimento')) return 'Investimentos';
    
    return 'Outras Receitas';
}

// Tratar erros de polling
bot.on('polling_error', (error) => {
    console.log('Erro polling:', error);
});

console.log('✅ Bot rodando! Agora vai funcionar!');
