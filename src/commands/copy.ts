import { Message } from "discord.js";
import fs from "fs";
import path from "path";

export const prefix = ".";

export async function handleCopyCommand(message: Message, args: string[]) {
  if (!message.guild) return;
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply("você precisa ser administrador para usar este comando.");
  }

  const fileName = args[0];
  if (!fileName) {
    return message.reply("use o comando assim: `.copy nomeDoArquivo`");
  }

  await message.reply("copiando estrutura do servidor...");

  const guild = message.guild;

  // Copiar cargos
  const roles = guild.roles.cache
    .filter(role => role.name !== "@everyone")
    .map(role => ({
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      permissions: role.permissions.bitfield.toString(),
      mentionable: role.mentionable,
    }));

  // Copiar canais
  const channels = guild.channels.cache.map(channel => {
    return {
      name: channel.name,
      type: channel.type,
      parent: channel.parent ? channel.parent.name : null,
      topic: (channel as any).topic || null,
      nsfw: (channel as any).nsfw || false,
      bitrate: (channel as any).bitrate || null,
      userLimit: (channel as any).userLimit || null,
      permissionOverwrites: channel.permissionOverwrites.cache.map(po => ({
        id: po.id,
        allow: po.allow.bitfield.toString(),
        deny: po.deny.bitfield.toString(),
        type: po.type,
      })),
    };
  });

  // Salvar em JSON
  const data = { roles, channels };
  const filePath = path.join(process.cwd(), `${fileName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  await message.reply(`estrutura copiada e salva em \`${fileName}.json\`!`);
}
