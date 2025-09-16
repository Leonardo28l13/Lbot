import { makeWASocket, fetchLatestBaileysVersion } from 'baileys';
import NodeCache from 'node-cache';
import configSocket from './config.js';
import { BotController } from './controllers/bot.controller.js';
import { connectionClose, connectionOpen, connectionPairingCode, connectionQr } from './events/connection.event.js';
// Importe seu message handler original (pode ser messageReceived ou o handleMessage do helper)
import { messageReceived } from './events/message-received.event.js'; 
import { addedOnGroup } from './events/group-added.event.js';
import { groupParticipantsUpdated } from './events/group-participants-updated.event.js';
import { partialGroupUpdate } from './events/group-partial-update.event.js';
import { syncGroupsOnStart } from './helpers/groups.sync.helper.js';
import { executeEventQueue, queueEvent } from './helpers/events.queue.helper.js';
import botTexts from './helpers/bot.texts.helper.js';
import { askQuestion, colorText } from './utils/general.util.js';
import { useNeDBAuthState } from './helpers/session.auth.helper.js';
// NOVO: Importa nosso novo middleware de moderação
import { checkMessageForModeration } from './middlewares/moderation.middleware.js';

const retryCache = new NodeCache();
const eventsCache = new NodeCache();
const messagesCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

export default async function connect() {
    const { state, saveCreds } = await useNeDBAuthState();
    const { version } = await fetchLatestBaileysVersion();
    const client = makeWASocket(configSocket(state, retryCache, version, messagesCache));
    let connectionType = null;
    let isBotReady = false;

    eventsCache.set("events", []);
    
    client.ev.process(async (events) => {
        const botInfo = new BotController().getBot();

        if (events['connection.update']) {
            const connectionState = events['connection.update'];
            const { connection, qr, receivedPendingNotifications } = connectionState;
            let needReconnect = false;
            if (!receivedPendingNotifications) {
                if (qr) {
                    if (!connectionType) {
                        console.log(colorText(botTexts.not_connected, '#e0e031'));
                        connectionType = await askQuestion(botTexts.input_connection_method);
                        if (connectionType == '2') {
                            connectionPairingCode(client);
                        } else {
                            connectionQr(qr);
                        }
                    } else if (connectionType != '2') {
                        connectionQr(qr);
                    }
                } else if (connection == 'connecting') {
                    console.log(colorText(botTexts.connecting));
                } else if (connection === 'close') {
                    needReconnect = await connectionClose(connectionState);
                }
            } else {
                await client.waitForSocketOpen();
                connectionOpen(client);
                await syncGroupsOnStart(client);
                isBotReady = true;
                await executeEventQueue(client, eventsCache);
                console.log(colorText(botTexts.server_started));
            }
            if (needReconnect) connect();
        }

        if (events['creds.update']) {
            await saveCreds();
        }

        if (events['messages.upsert']) {
            const message = events['messages.upsert'];
            if (isBotReady) {
                // 1. Deixa o bot trabalhar em paz com seu handler de mensagens/comandos original
                await messageReceived(client, message, botInfo, messagesCache);

                // 2. Em paralelo, chama a moderação para "observar" a mensagem
                await checkMessageForModeration(client, message);
            }
        }
        
        if (events['group-participants.update']) {
            const participantsUpdate = events['group-participants.update'];
            if (isBotReady) await groupParticipantsUpdated(client, participantsUpdate, botInfo);
            else queueEvent(eventsCache, "group-participants.update", participantsUpdate);
        }

        if (events['groups.upsert']) {
            const groups = events['groups.upsert'];
            if (isBotReady) await addedOnGroup(client, groups, botInfo);
            else queueEvent(eventsCache, "groups.upsert", groups);
        }

        if (events['groups.update']) {
            const groups = events['groups.update'];
            if (groups.length == 1 && groups[0].participants == undefined) {
                if (isBotReady) await partialGroupUpdate(groups[0]);
                else queueEvent(eventsCache, "groups.update", groups);
            }
        }
    });
}

