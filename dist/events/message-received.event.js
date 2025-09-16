import { showConsoleError } from '../utils/general.util.js';
import { UserController } from '../controllers/user.controller.js';
import { handleGroupMessage, handlePrivateMessage } from '../helpers/message.handler.helper.js';
import { GroupController } from '../controllers/group.controller.js';
import { storeMessageOnCache, formatWAMessage } from '../utils/whatsapp.util.js';
import { commandInvoker } from '../helpers/command.invoker.helper.js';

// Objeto para controlar o Anti-flood
const floodControl = {};

export async function messageReceived(client, messages, botInfo, messageCache, historicoGrupo, verificarSeHaBriga) {
    try {
        const msgData = messages.messages[0];
        if (!msgData || messages.type !== 'notify' || !msgData.message) {
            return; // Ignora notificações que não são mensagens
        }

        if (msgData.key.fromMe) {
            storeMessageOnCache(msgData, messageCache);
        }

        const userController = new UserController();
        const groupController = new GroupController();
        const idChat = msgData.key.remoteJid;
        const isGroupMsg = idChat?.endsWith("@g.us");
        const group = (isGroupMsg && idChat) ? await groupController.getGroup(idChat) : null;
        let message = await formatWAMessage(msgData, group, botInfo.host_number);
        
        if (message) {
            await userController.registerUser(message.sender, message.pushname);
            
            if (!isGroupMsg) {
                const needCallCommand = await handlePrivateMessage(client, botInfo, message);
                if (needCallCommand) {
                    await commandInvoker(client, botInfo, message, null);
                }
            } else if (group) {
                const senderId = message.sender;
                const groupId = group.id_group;

                // --- INÍCIO DA LÓGICA ANTI-FLOOD ---
                // Verifica se o anti-flood está ativo no grupo e se o autor não é admin
                if (group.antiflood && group.antiflood.status && !message.isGroupAdmin) {
                    const now = Date.now();
                    const key = `${groupId}-${senderId}`;
                    
                    if (!floodControl[key]) {
                        floodControl[key] = [];
                    }
                    
                    floodControl[key].push(now);
                    
                    const floodWindow = (group.antiflood.interval || 10) * 1000;
                    floodControl[key] = floodControl[key].filter(timestamp => now - timestamp < floodWindow);
                    
                    const floodMaxMsgs = group.antiflood.max_messages || 5;
                    
                    if (floodControl[key].length > floodMaxMsgs) {
                        await client.groupParticipantsUpdate(groupId, [senderId], "remove");
                        delete floodControl[key];
                        return; // Para a execução para não processar mais nada deste usuário
                    }
                }
                // --- FIM DA LÓGICA ANTI-FLOOD ---

                // --- INÍCIO DA LÓGICA DE MODERAÇÃO DE BRIGAS ---
                const LIMITE_MENSAGENS = 15;
                const senderName = message.pushname || "Desconhecido";
                const messageBody = message.body;

                if (messageBody && verificarSeHaBriga) {
                    if (!historicoGrupo[groupId]) {
                        historicoGrupo[groupId] = [];
                    }
                    historicoGrupo[groupId].push(`${senderName}: ${messageBody}`);
                    if (historicoGrupo[groupId].length > LIMITE_MENSAGENS) {
                        historicoGrupo[groupId].shift();
                    }
                    if (historicoGrupo[groupId].length > 5) {
                        const conversaParaAnalisar = historicoGrupo[groupId].join('\n');
                        const brigaDetectada = await verificarSeHaBriga(conversaParaAnalisar);
                        if (brigaDetectada) {
                            await client.sendMessage(groupId, { text: '🕊️ Calma, pessoal! Vamos manter a conversa amigável e respeitosa.' });
                            historicoGrupo[groupId] = []; 
                        }
                    }
                }
                // --- FIM DA LÓGICA DE MODERAÇÃO DE BRIGAS ---

                // Continua com a lógica original de comandos do bot
                const needCallCommand = await handleGroupMessage(client, group, botInfo, message);
                if (needCallCommand) {
                    await commandInvoker(client, botInfo, message, group);
                }
            }
        }
    }
    catch (err) {
        showConsoleError(err, "MESSAGES.UPSERT");
    }
}
