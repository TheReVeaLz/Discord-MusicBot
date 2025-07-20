const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder, Colors, ApplicationIntegrationType } = require("discord.js");

const command = new SlashCommand()
.setName("previous")
.setDescription("Go back to the previous song.")
.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
	.setRun(async (client, interaction) => {
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
					.setDescription("There are no previous songs for this session."),
			],
			ephemeral: true,
		});
	}

	const previousSong = player.queue.previous[0];
	const currentSong = player.queue.current;
	const nextSong = player.queue[0]

	if (!previousSong || previousSong === currentSong || previousSong === nextSong) {
		return interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setColor(Colors.Red)
					.setDescription("There is no previous song in the queue."),
			],
		})
	}

	if (previousSong !== currentSong && previousSong !== nextSong) {
		player.queue.add([previousSong, currentSong], 0);
		player.queue.previous.splice(0, 1);
		player.play(previousSong);
	}
	interaction.reply({
		embeds: [
			new EmbedBuilder()
				.setColor(client.config.embedColor)
				.setDescription(
					`⏮ | Previous song: **${ previousSong.title }**`,
				),
		],
	});
});

module.exports = command;
