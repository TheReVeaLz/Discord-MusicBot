const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder, Colors } = require("discord.js");

const command = new SlashCommand()
	.setName("skip")
	.setDescription("Skip the current song")
	.setRun(async (client, interaction, options) => {
		try {
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
							.setDescription("There is nothing to skip."),
					],
					ephemeral: true,
				});
			} 
			const song = player.queue.current;
			const autoQueue = player.get("autoQueue");
	
			if (player.queue.tracks[0] == undefined && (!autoQueue || autoQueue === false)) {
				return interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor(Colors.Red)
							.setDescription(`There is nothing after [${ song.title }](${ song.uri }) in the queue.`),
					]
				}
			)}
			
			player.skip();
			
			interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(client.config.embedColor)
						.setDescription("✅ | **Skipped!**"),
				],
			});
		} catch (err) {
			client.error(err);
		}
	});

module.exports = command;
