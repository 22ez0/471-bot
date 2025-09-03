// src/commands/moderation.ts
import {
  Client,
  Message,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  GuildMember,
} from "discord.js";

const PREFIX = "."; // prefixo do bot

export function setupModeration(client: Client) {
  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    // .mute @membro (tempo em minutos)
    if (command === "mute") {
      if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply("você não tem permissão para mutar membros.");
      }

      const member = message.mentions.members?.first();
      const duration = parseInt(args[1]) || 5; // padrão 5 minutos
      if (!member) return message.reply("mencione um membro para mutar.");

      try {
        await member.timeout(duration * 60 * 1000, `Mutado por ${message.author.tag}`);
        message.reply(` ${member.user.tag} foi mutado por ${duration} minuto(s).`);
      } catch (err) {
        console.error(err);
        message.reply("não consegui mutar o membro.");
      }
    }

    // .ban @membro
    else if (command === "ban") {
      if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply("você não tem permissão para banir membros.");
      }

      const member = message.mentions.members?.first();
      if (!member) return message.reply("mencione um membro para banir.");

      try {
        await member.ban({ reason: `banido por ${message.author.tag}` });
        message.reply(` ${member.user.tag} foi banido.`);
      } catch (err) {
        console.error(err);
        message.reply("não consegui banir o membro.");
      }
    }

    // .clear (número de mensagens)
    else if (command === "clear") {
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply("você não tem permissão para limpar mensagens.");
      }

      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount < 1 || amount > 100) {
        return message.reply("forneça um número entre 1 e 100.");
      }

      const channel = message.channel as TextChannel;
      try {
        await channel.bulkDelete(amount, true);
        message.reply(` ${amount} mensagens foram apagadas.`).then(msg => {
          setTimeout(() => msg.delete(), 3000);
        });
      } catch (err) {
        console.error(err);
        message.reply("não consegui apagar as mensagens.");
      }
    }

    // .nk
    else if (command === "nk") {
      if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply("apenas administradores podem usar este comando.");
      }

      const channel = message.channel as TextChannel;
      try {
        const newChannel = await channel.clone({
          name: channel.name,
          reason: `recriado por comando .nk (${message.author.tag})`,
        });
        await channel.delete("canal recriado pelo comando .nk");
        message.guild.channels.cache
          .get(newChannel.id)
          ?.send(`canal recriado por ${message.author}`);
      } catch (err) {
        console.error(err);
        message.reply("não consegui recriar o canal.");
      }
    }

    // .r @cargo(s) @membro
    else if (command === "r") {
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply("você não tem permissão para adicionar cargos.");
      }

      const mentionedRoles = message.mentions.roles;
      const member = message.mentions.members?.last();

      if (!mentionedRoles.size || !member) {
        return message.reply("use: .r @cargo(s) @membro ");
      }

      try {
        await member.roles.add(mentionedRoles);
        message.reply(`cargos adicionados a ${member.user.tag}.`);
      } catch (err) {
        console.error(err);
        message.reply("não consegui adicionar os cargos.");
      }
    }
  });
}
