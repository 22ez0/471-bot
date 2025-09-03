import {
  Client,
  Message,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  Events,
} from "discord.js";

const CREATOR_ID = "1412179586585854054";  // id do criador do bot
const PREFIX = "."; // prefixo do bot

export function setupIg(client: Client) {
  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;

    // comando .ig para criar canal
    if (message.content === `${PREFIX}ig`) {
      if (!message.guild) return;

      // precisa ter permissão
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await message.reply("você não tem permissão para criar o canal.");
        return;
      }

      let channel = message.guild.channels.cache.find(
        (c) => c.name === "insta" && c.type === ChannelType.GuildText
      );

      if (!channel) {
        channel = await message.guild.channels.create({
          name: "insta",
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: message.guild.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
          ],
        });

        await message.reply("canal **#insta** criado com sucesso!");
      } else {
        await message.reply("o canal **#insta** já existe!");
      }
      return;
    }

    // somente mensagens no #insta
    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.channel.name !== "insta") return;

    // se não tiver anexo → apaga
    if (!message.attachments.size) {
      await message.delete().catch(() => {});
      return;
    }

    // botão curtir
    const likeButton = new ButtonBuilder()
      .setCustomId(`like-${message.author.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:cat:1412514639874359538>")
      .setLabel("Curtir");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(likeButton);

    // conteúdo: se o user mandar texto, vai junto; se não, só foto
    const content = message.content
      ? `${message.author} ${message.content}`
      : `${message.author}`;

    // reenvia mensagem
    await message.channel.send({
      content,
      files: Array.from(message.attachments.values()).map((a) => a.url),
      components: [row],
    });

    // apaga a original
    await message.delete().catch(() => {});
  });

  // curtir post
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, authorId] = interaction.customId.split("-");
    if (action !== "like") return;

    const liker = interaction.user;
    const postOwner = await client.users.fetch(authorId);
    const creator = await client.users.fetch(CREATOR_ID);

    await postOwner
      .send(` ${liker.username} curtiu sua foto no #insta!`)
      .catch(() => {});
    await creator
      .send(
        ` ${liker.username} curtiu uma foto de ${postOwner.username} no #insta.`
      )
      .catch(() => {});

    await interaction.reply({
      content: "você curtiu a foto",
      ephemeral: true,
    });
  });
}
