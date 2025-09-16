import { getMessageData } from "../helpers/message.helper.js";
import { verificarSeHaBriga } from "../utils/verificarBriga.js";

// O histórico dos grupos agora vive aqui, de forma isolada.
const historicoGrupo = {};

/**
 * Middleware que verifica uma mensagem para moderação de forma independente.
 * @param {import('baileys').WASocket} client O cliente do Baileys.
 * @param {import('baileys').BaileysEventMap['messages.upsert']} message O evento da mensagem.
 */
export async function checkMessageForModeration(client, message) {
    const { remoteJid, messageText, sender, isGroup, senderName } = getMessageData(message);

    // A moderação só atua em mensagens de texto dentro de grupos
    if (!isGroup || !messageText || !sender) {
        return;
    }

    // Ignora mensagens que são comandos para não analisá-las como conversa
    const commandPrefix = '!'; // Use o mesmo prefixo dos seus comandos
    if (messageText.startsWith(commandPrefix)) {
        return;
    }

    // O resto da lógica é a que já conhecemos, mas agora dentro deste arquivo.
    if (!historicoGrupo[remoteJid]) {
        historicoGrupo[remoteJid] = "";
    }

    const nomeLimpo = senderName || sender.split('@')[0];
    historicoGrupo[remoteJid] += `${nomeLimpo}: ${messageText}\n`;

    const linhas = historicoGrupo[remoteJid].split('\n');
    if (linhas.length > 20) {
        historicoGrupo[remoteJid] = linhas.slice(linhas.length - 20).join('\n');
    }

    const temBriga = await verificarSeHaBriga(historicoGrupo[remoteJid]);

    if (temBriga) {
        console.warn(`\n[MODERADOR] Briga detectada no grupo ${remoteJid}! Enviando aviso...`);
        const mensagemDeAviso = "⚠️ *Atenção, pessoal!* ⚠️\n\nDetectei uma discussão acalorada. Por favor, vamos manter a calma, o respeito e seguir as regras do grupo. Evitem linguagem agressiva e ofensas.\n\n_— Mensagem automática do Bot Moderador_";
        
        try {
            await client.sendMessage(remoteJid, { text: mensagemDeAviso });
            historicoGrupo[remoteJid] = ""; // Limpa o histórico após o aviso
            console.log(`[MODERADOR] Aviso enviado e histórico do grupo ${remoteJid} foi limpo.`);
        } catch (error) {
            console.error(`[MODERADOR] Falha ao enviar mensagem de aviso para o grupo ${remoteJid}:`, error);
        }
    }
}

