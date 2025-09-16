// misc.functions.js
import fetch from "node-fetch";
import { funnyRandomPhrases } from "../utils/misc.util.js";
import * as waUtil from "../utils/whatsapp.util.js";
import { buildText, messageErrorCommandUsage, uppercaseFirst } from "../utils/general.util.js";
import botTexts from "../helpers/bot.texts.helper.js";
import miscCommands from "./misc.list.commands.js";
import { GroupController } from "../controllers/group.controller.js";
import path from "path";

const API_KEY = "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";
const endpoint = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Função auxiliar para chamar a IA via Groq (sem histórico)
 */
async function chamarIA(systemPrompt, userPrompt, max_tokens = 500, temperature = 0.7) {
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b", // Modelo Groq potente
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature,
                max_tokens,
            }),
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || "⚠️ Sem resposta da IA.";
    } catch (err) {
        console.error("Erro na API Groq:", err);
        return "❌ Erro ao conectar com a IA.";
    }
}

/**
 * ===============================
 * Comandos Misc
 * ===============================
 */

export async function sorteioCommand(client, botInfo, message, group) {
    if (!message.args.length) throw new Error(messageErrorCommandUsage(botInfo.prefix, message));
    const chosenNumber = Number(message.text_command);
    if (!chosenNumber || chosenNumber <= 1) throw new Error(miscCommands.sorteio.msgs.error_invalid_value);

    const randomNumber = Math.floor(Math.random() * chosenNumber) + 1;
    const replyText = buildText(miscCommands.sorteio.msgs.reply, randomNumber);
    await waUtil.replyText(client, message.chat_id, replyText, message.wa_message, { expiration: message.expiration });
}

export async function sorteiomembroCommand(client, botInfo, message, group) {
    const groupController = new GroupController();
    if (!message.isGroupMsg || !group) throw new Error(botTexts.permission.group);

    const currentParticipantsIds = await groupController.getParticipantsIds(group.id);
    const randomParticipant = currentParticipantsIds[Math.floor(Math.random() * currentParticipantsIds.length)];
    const replyText = buildText(miscCommands.sorteiomembro.msgs.reply, waUtil.removeWhatsappSuffix(randomParticipant));
    await waUtil.replyWithMentions(client, message.chat_id, replyText, [randomParticipant], message.wa_message, { expiration: message.expiration });
}

export async function mascoteCommand(client, botInfo, message, group) {
    const imagePath = path.resolve("dist/media/mascote.png");
    await waUtil.replyFile(client, message.chat_id, "imageMessage", imagePath, "WhatsApp Jr.", message.wa_message, { expiration: message.expiration });
}

export async function viadometroCommand(client, botInfo, message, group) {
    if (!message.isGroupMsg) throw new Error(botTexts.permission.group);
    else if (!message.isQuoted && !message.mentioned.length) throw new Error(messageErrorCommandUsage(botInfo.prefix, message));
    else if (message.mentioned.length > 1) throw new Error(miscCommands.viadometro.msgs.error_mention);

    const randomNumber = Math.floor(Math.random() * 100);
    const messageToReply = (message.quotedMessage && message.mentioned.length != 1)
        ? message.quotedMessage?.wa_message
        : message.wa_message;
    const replyText = buildText(miscCommands.viadometro.msgs.reply, randomNumber);
    await waUtil.replyText(client, message.chat_id, replyText, messageToReply, { expiration: message.expiration });
}

export async function detectorCommand(client, botInfo, message, group) {
    if (!message.isGroupMsg) throw new Error(botTexts.permission.group);
    else if (!message.isQuoted) throw new Error(messageErrorCommandUsage(botInfo.prefix, message));

    const quotedMessage = message.quotedMessage?.wa_message;
    if (!quotedMessage) throw new Error(miscCommands.detector.msgs.error_message);

    const imagePathCalibration = path.resolve("dist/media/calibrando.png");
    const imagePathsResult = [
        path.resolve("dist/media/estressealto.png"),
        path.resolve("dist/media/incerteza.png"),
        path.resolve("dist/media/kao.png"),
        path.resolve("dist/media/meengana.png"),
        path.resolve("dist/media/mentiroso.png"),
        path.resolve("dist/media/vaipra.png"),
        path.resolve("dist/media/verdade.png"),
    ];
    const randomIndex = Math.floor(Math.random() * imagePathsResult.length);
    await waUtil.replyFile(client, message.chat_id, "imageMessage", imagePathCalibration, miscCommands.detector.msgs.wait, quotedMessage, { expiration: message.expiration });
    await waUtil.replyFile(client, message.chat_id, "imageMessage", imagePathsResult[randomIndex], "", quotedMessage, { expiration: message.expiration });
}

export async function roletarussaCommand(client, botInfo, message, group) {
    const bulletPosition = Math.floor(Math.random() * 6) + 1;
    const currentPosition = Math.floor(Math.random() * 6) + 1;
    const hasShooted = (bulletPosition === currentPosition);
    const replyText = hasShooted ? miscCommands.roletarussa.msgs.reply_dead : miscCommands.roletarussa.msgs.reply_alive;
    await waUtil.replyText(client, message.chat_id, replyText, message.wa_message, { expiration: message.expiration });
}

// ... aqui permanecem todas as outras funções existentes (casal, caracoroa, ppt, gadometro, bafometro, top5, par, chance, frase) ...

/**
 * 🔹 Comando de IA (GPT-4o via Groq) sem histórico
 */
export async function iaCommand(client, botInfo, message, group) {
    if (!message.args.length) throw new Error(miscCommands.ia.msgs.error_no_question);

    const userQuestion = message.text_command;
    await waUtil.replyText(client, message.chat_id, miscCommands.ia.msgs.wait, message.wa_message);

    const systemPrompt = "Você é um assistente prestativo integrado a um bot de WhatsApp. Responda de forma curta, clara e usando *negrito*, _itálico_ ou ~riscado~ quando apropriado.";
    const aiResponse = await chamarIA(systemPrompt, userQuestion, 1024, 0.7);

    const replyText = buildText(miscCommands.ia.msgs.reply, aiResponse);
    await waUtil.replyText(client, message.chat_id, replyText, message.wa_message, { expiration: message.expiration });
}

/**
 * 🔹 Detector de briga usando GPT-4o
 */
export async function verificarSeHaBriga(historicoChat) {
    const systemPrompt = "Você é um moderador de chat com IA. Responda apenas com 'true' se houver briga, ou 'false' caso contrário. Nada além disso.";
    const resposta = await chamarIA(systemPrompt, `Conversa:\n\n${historicoChat}`, 5, 0.1);
    return resposta.toLowerCase().includes("true");
}
