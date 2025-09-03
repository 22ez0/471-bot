import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import { avsCommand, handleAvsCommand } from "./avs-slash.js";
import { setupIg } from "./ig.js"; // <<< adicionado
import fs from "fs";
import path from "path";

// cria o client do bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // <<< adicionado para ler mensagens
  ],
});

// inicializa o REST com o token
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

client.once("ready", async () => {
  console.log(`✅ Bot logado como ${client.user?.tag}`);

  try {
    // lista inicial de comandos (avs vem direto do avs-slash.ts)
    const commands: any[] = [avsCommand.toJSON()];

    // carrega automaticamente comandos da pasta commands2
    const commandsPath = path.join(__dirname, "commands2");
    if (fs.existsSync(commandsPath)) {
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath);

        if ("data" in command && "execute" in command) {
          commands.push(command.data.toJSON());
          console.log(`✅ Comando carregado: ${command.data.name}`);
        } else {
          console.log(`⚠️ Ignorado: ${file}`);
        }
      }
    }

    // registra os comandos globalmente
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands }
    );

    console.log("✅ Comandos registrados com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "avs") {
    await handleAvsCommand(interaction);
  }
});

// ativa o sistema do .ig sem mexer em nada do resto
setupIg(client);

// login:
client.login(process.env.DISCORD_TOKEN);
