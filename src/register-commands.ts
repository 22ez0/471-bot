import { Client, GatewayIntentBits } from "discord.js";
import { handleCopyCommand } from "./commands/copy";
import { handlePastCommand } from "./commands/past";
import {
  handleModCommand,
  handleMod1Command,
  automodCheck,
} from "./commands/mod";
import { setupModeration } from "./commands/moderation"; // ⬅️ novo módulo

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // necessário para timeout
  ],
});

const prefix = ".";

client.once("ready", () => {
  console.log(`✅ Bot logado como ${client.user?.tag}`);
});

// ativa os comandos de moderação
setupModeration(client);

client.on("messageCreate", async (message) => {
  // roda automod ANTES de checar prefixo
  await automodCheck(message);

  if (!message.content.startsWith(prefix)) return;
  if (!message.guild || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  try {
    if (command === "copy") {
      await handleCopyCommand(message, args);
    } else if (command === "past") {
      await handlePastCommand(message, args);
    } else if (command === "mod") {
      await handleModCommand(message);
    } else if (command === "mod1") {
      await handleMod1Command(message, args);
    }
  } catch (err) {
    console.error(err);
    message.reply("❌ Ocorreu um erro ao executar o comando.");
  }
});

client.login(process.env.TOKEN);
