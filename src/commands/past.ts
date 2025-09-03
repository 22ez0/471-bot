import { Message, ChannelType } from "discord.js";
import fs from "fs";
import path from "path";

export const prefix = ".";

export async function handlePastCommand(message: Message, args: string[]) {
  if (!message.guild) return;
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply("você precisa ser administrador para usar este comando.");
  }

  const fileName = args[0];
  if (!fileName) {
    return message.reply("use o comando assim: `.past nomeDoArquivo`");
  }

  const filePath = path.join(process.cwd(), `${fileName}.json`);
  if (!fs.existsSync(filePath)) {
    return message.reply(`arquivo \`${fileName}.json\` não encontrado.`);
  }

  await message.reply("recriando estrutura do servidor...");

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const guild = message.guild;

  // Criar cargos
  for (const roleData of data.roles) {
    try {
      await guild.roles.create({
        name: roleData.name,
        color: roleData.color,
        hoist: roleData.hoist,
        permissions: BigInt(roleData.permissions),
        mentionable: roleData.mentionable,
      });
    } catch (err) {
      console.error(`erro ao criar cargo ${roleData.name}:`, err);
    }
  }

  // Criar categorias
  const categoryMap: Record<string, any> = {};
  for (const ch of data.channels) {
    try {
      if (ch.type === ChannelType.GuildCategory) {
        const category = await guild.channels.create({
          name: ch.name,
          type: ChannelType.GuildCategory,
        });
        categoryMap[ch.name] = category.id;
      }
    } catch (err) {
      console.error(`erro ao criar categoria ${ch.name}:`, err);
    }
  }

  // Criar canais
  for (const ch of data.channels) {
    try {
      if (ch.type !== ChannelType.GuildCategory) {
        await guild.channels.create({
          name: ch.name,
          type: ch.type,
          topic: ch.topic,
          nsfw: ch.nsfw,
          bitrate: ch.bitrate || undefined,
          userLimit: ch.userLimit || undefined,
          parent: ch.parent && categoryMap[ch.parent] ? categoryMap[ch.parent] : undefined,
        });
      }
    } catch (err) {
      console.error(`erro ao criar canal ${ch.name}:`, err);
    }
  }

  await message.reply(`estrutura do arquivo \`${fileName}.json\` recriada com sucesso!`);
}
