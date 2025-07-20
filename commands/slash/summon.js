const { EmbedBuilder, ApplicationIntegrationType } = require("discord.js");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
	.setName("summon")
	.setDescription("Summons the bot to the channel.")
	.setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
	.setRun(async (client, interaction, options) => {
		let channel = await client.getChannel(client, interaction);
		if (!interaction.member.voice.channel) {
			const joinEmbed = new EmbedBuilder()
				.setColor(client.config.embedColor)
				.setDescription(
					"❌ | **You must be in a voice channel to use this command.**",
				);
			return interaction.reply({ embeds: [joinEmbed], ephemeral: true });
		}
		
		let player = client.manager.players.get(interaction.guild.id);
		if (!player) {
			player = client.createPlayer(interaction.channel, channel);
			player.connect(true);
		}
		
		if (channel.id !== player.voiceChannel) {
			player.setVoiceChannel(channel.id);
			player.connect();
		}
		
		interaction.reply({
			embeds: [
				client.Embed(`:thumbsup: | **Successfully joined <#${ channel.id }>!**`),
			],
		});
	});

module.exports = command;
