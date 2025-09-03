import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  ChannelType,
} from "discord.js";

export const avsCommand = new SlashCommandBuilder()
  .setName("avs")
  .setDescription("Envia um embed personalizado para um canal.")
  .addChannelOption((option) =>
    option
      .setName("canal")
      .setDescription("Canal onde será enviado o embed")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("titulo").setDescription("Título do embed").setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("texto")
      .setDescription("Texto/descrição do embed")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("imagem").setDescription("URL da imagem").setRequired(false)
  );

export async function handleAvsCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const canal = interaction.options.getChannel("canal") as TextChannel;
  const titulo = interaction.options.getString("titulo", true);
  const texto = interaction.options.getString("texto", true);
  const imagem = interaction.options.getString("imagem");

  const embed = new EmbedBuilder()
    .setColor("#00070c")
    .setTitle(titulo)
    .setDescription(texto);

  if (imagem) {
    embed.setImage(imagem);
  }

  try {
    await canal.send({ embeds: [embed] });
    await interaction.reply({
      content: `embed enviado com sucesso em ${canal}!`,
      ephemeral: true,
    });
  } catch (err) {
    console.error("erro ao enviar embed:", err);
    await interaction.reply({
      content: "erro ao tentar enviar o embed.",
      ephemeral: true,
    });
  }
}
