const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder, Colors } = require("discord.js");

const command = new SlashCommand()
	.setName("move")
	.setDescription("Moves track to a different position")
	.addIntegerOption((option) =>
		option
			.setName("from")
			.setDescription("The track number to move")
			.setRequired(true),
	)
	.addIntegerOption((option) =>
		option
			.setName("to")
			.setDescription("The position to move the track to")
			.setRequired(true),
	)
	
	.setRun(async (client, interaction) => {
		const from = interaction.options.getInteger("from");
		const to = interaction.options.getInteger("to");
		
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
						.setDescription("There's nothing playing."),
				],
				ephemeral: true,
			});
		}
		
		let trackNum = Number(from) - 1;
		if (trackNum < 0 || trackNum > player.queue.length - 1) {
			return interaction.reply(":x: | **Invalid track number**");
		}
		
		let dest = Number(to) - 1;
		if (dest < 0 || dest > player.queue.length - 1) {
			return interaction.reply(":x: | **Invalid position number**");
		}
		
		const track = player.queue[trackNum];
		player.queue.splice(trackNum, 1);
		player.queue.splice(dest, 0, track);
		return interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setColor(client.config.embedColor)
					.setDescription(`:white_check_mark: | **Moved track [${track.title}](${track.uri}) to ${to}**`),
			],
		});
	});

module.exports = command;
