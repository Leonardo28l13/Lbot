// ATENÇÃO: Verifique se sua chave de API está correta aqui!
const API_KEY = "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"; // ⚠️ SUA CHAVE DA GROQ!
const endpoint = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Analisa um bloco de texto de um chat e retorna true se detectar uma briga.
 * @param {string} historicoChat O histórico da conversa a ser analisado.
 * @returns {Promise<boolean>} Retorna true se houver briga, caso contrário, false.
 */
export async function verificarSeHaBriga(historicoChat) {
    // Se o histórico for muito curto ou vazio, não há o que analisar.
    if (!historicoChat || historicoChat.trim().split('\n').length < 2) {
        return false;
    }

    console.log("Enviando histórico para análise da IA...");

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "Você é um moderador de chat do WhatsApp. Responda APENAS com 'true' se houver uma briga, discussão acalorada ou xingamentos na conversa. Responda APENAS com 'false' se for uma conversa normal."
                    },
                    {
                        role: "user",
                        content: `Analise a seguinte conversa de um grupo de WhatsApp:\n\n---\n${historicoChat}\n---`
                    }
                ],
                temperature: 0.1,
                max_tokens: 5 // A resposta é apenas 'true' ou 'false'
            })
        });
        
        if (!response.ok) {
            const errorBody = await response.json().catch(() => response.text());
            console.error(`[ERRO DA API GROQ] Status: ${response.status}`);
            console.error("[ERRO DA API GROQ] Corpo da Resposta:", errorBody);
            return false;
        }

        const data = await response.json();
        const respostaAI = data.choices?.[0]?.message?.content?.toLowerCase().trim();
        
        console.log(`Análise da IA concluída. Resultado: '${respostaAI}'`);

        return respostaAI === "true";

    } catch (error) {
        console.error("[ERRO DE CONEXÃO] Não foi possível contatar a API da Groq:", error);
        return false;
    }
}

