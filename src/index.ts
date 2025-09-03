import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Carregar eventos dinamicamente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const eventsPath = join(__dirname, "events");
fs.readdirSync(eventsPath).forEach(async file => {
  if (file.endsWith(".ts") || file.endsWith(".js")) {
    const event = await import(join(eventsPath, file));
    if (event.default && event.default.name) {
      if (event.default.once) {
        client.once(event.default.name, (...args) => event.default.execute(...args, client));
      } else {
        client.on(event.default.name, (...args) => event.default.execute(...args, client));
      }
    }
  }
});

// Servidor Express para manter online no Replit
const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(port, () => console.log(`Web server running on port ${port}`));

client.login(process.env.DISCORD_TOKEN);
