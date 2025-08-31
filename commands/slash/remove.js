const SlashCommand = require("../../lib/SlashCommand");
const { EmbedBuilder, Colors, ApplicationIntegrationType } = require("discord.js");

const command = new SlashCommand()
	.setName("remove")
	.setDescription("Remove track you don't want from queue")
	.addNumberOption((option) =>
		option
			.setName("number")
			.setDescription("Enter track number.")
			.setRequired(true),
	)
	
	.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
	.setRun(async (client, interaction) => {
		const number = interaction.options.getNumber("number");
		
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
						.setDescription("There are no songs to remove."),
				],
				ephemeral: true,
			});
		}
		
		await interaction.deferReply();
		
		const position = Number(number) - 1;
		if (position > player.queue.tracks.length) {
			let thing = new EmbedBuilder()
				.setColor(client.config.embedColor)
				.setDescription(
					`Queue only has **${player.queue.tracks.length}** track`,
				);
			return interaction.editReply({ embeds: [thing] });
		}
		
		const song = player.queue.tracks[position];
		player.queue.remove(position);
		
		let removeEmbed = new EmbedBuilder()
			.setColor(client.config.embedColor)
			.setDescription(`Removed [**${ song.info.title }**](${ song.info.uri }) from queue`);
		return interaction.editReply({ embeds: [removeEmbed] });
	});

module.exports = command;
