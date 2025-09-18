const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder, Colors, ApplicationIntegrationType } = require("discord.js");

const command = new SlashCommand()
	.setName("pause")
	.setDescription("Pauses the current playing track")
	.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
	.setRun(async (client, interaction, options) => {
		let channel = await client.getChannel(client, interaction);
		if (!channel) {
			return;
		}
		
		let player;
		if (client.manager) {
			player = client.manager.players.get(interaction.guild.id);
		} else {
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(Colors.Red)
						.setDescription("Lavalink node is not connected"),
				],
			});
		}
		
		if (!player) {
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(Colors.Red)
						.setDescription("Nothing is playing."),
				],
				ephemeral: true,
			});
		}
		
		if (player.paused) {
			return interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(Colors.Red)
						.setDescription("Current playing track is already paused!"),
				],
				ephemeral: true,
			});
		}
		
		player.pause();
		return interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setColor(client.config.embedColor)
					.setDescription(`⏸ | **Paused!**`),
			],
		});
	});

module.exports = command;
