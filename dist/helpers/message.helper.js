// helpers/message.helper.js

/**
 * Extrai e simplifica os dados de uma mensagem recebida do Baileys.
 * @param {import('baileys').BaileysEventMap['messages.upsert']} messageEvent 
 * @returns {{
 * remoteJid: string,
 * messageText: string | null,
 * sender: string,
 * isGroup: boolean,
 * senderName: string
 * }}
 */
export function getMessageData(messageEvent) {
    const message = messageEvent.messages[0];

    const remoteJid = message.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');
    const sender = isGroup ? message.key.participant : message.key.remoteJid;
    const senderName = message.pushName || '';

    // Extrai o texto da mensagem, considerando diferentes tipos
    let messageText = null;
    if (message.message?.conversation) {
        messageText = message.message.conversation;
    } else if (message.message?.extendedTextMessage) {
        messageText = message.message.extendedTextMessage.text;
    } else if (message.message?.imageMessage) {
        messageText = message.message.imageMessage.caption;
    } else if (message.message?.videoMessage) {
        messageText = message.message.videoMessage.caption;
    }

    return {
        remoteJid,
        messageText,
        sender,
        isGroup,
        senderName
    };
}

