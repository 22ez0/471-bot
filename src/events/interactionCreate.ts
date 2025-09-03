export default {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = (await import(`../commands/${interaction.commandName}.js`)).default;
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "❌ Ocorreu um erro ao executar este comando.", ephemeral: true });
    }
  }
};
