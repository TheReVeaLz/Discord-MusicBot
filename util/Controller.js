const { EmbedBuilder, Colors } = require("discord.js");
/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 * @param {import("discord.js").ButtonInteraction} interaction
 */
module.exports = async (client, interaction) => {
	try {

		let guild = client.guilds.cache.get(interaction.customId.split(":")[1]);
		let property = interaction.customId.split(":")[2];
		let player = client.manager.getPlayer(guild.id);
	
		if (!player) {
			await interaction.reply({
				embeds: [
					client.Embed("❌ | **There is no player to control in this server.**"),
				],
			});
			setTimeout(() => {
				interaction.deleteReply();
			}, 5000);
			return;
		}
		if (!interaction.member.voice.channel) {
			const joinEmbed = new EmbedBuilder()
				.setColor(client.config.embedColor)
				.setDescription(
					"❌ | **You must be in a voice channel to use this action!**",
				);
			return interaction.reply({ embeds: [joinEmbed], ephemeral: true });
		}
	
		if (
			interaction.guild.members.me.voice.channel &&
			!interaction.guild.members.me.voice.channel.equals(interaction.member.voice.channel)
		) {
			const sameEmbed = new EmbedBuilder()
				.setColor(client.config.embedColor)
				.setDescription(
					"❌ | **You must be in the same voice channel as me to use this action!**",
				);
			return await interaction.reply({ embeds: [sameEmbed], ephemeral: true });
		}
	
		if (property === "Stop") {
			player.stopPlaying();
			player.set("autoQueue", false);
			player.destroy();
			client.warn(`Player: ${ player.options.guildId } | Successfully stopped the player`);
			const msg = await interaction.channel.send({
				embeds: [
					client.Embed(
						"⏹️ | **Successfully stopped the player**",
					),
				],
			});
			setTimeout(() => {
				msg.delete();
			}, 5000);
	
			interaction.update({
				components: [client.createController(player.options.guildId, player)],
			});
			return;
		}
	
		// if theres no previous song, return an error.
		if (property === "Replay") {
			const previousSong = player.queue.previous[0];
			const currentSong = player.queue.current;
			const nextSong = player.queue.tracks[0]
			if (!previousSong || previousSong === player.queue.current || previousSong === player.queue.tracks[0]) {
				
			   return interaction.reply({
				ephemeral: true,
				embeds: [
					new EmbedBuilder()
						.setColor(Colors.Red)
						.setDescription(`There is no previous song played.`),
				],
			});
		}
			if (previousSong !== currentSong && previousSong !== nextSong) {
				player.queue.add([previousSong, currentSong], 0);
				player.queue.previous.splice(0, 1);
				player.skip();
				return interaction.deferUpdate();
			}
		}
	
		if (property === "PlayAndPause") {
			if (!player || (!player.playing && player.queue.totalSize === 0)) {
				const msg = await interaction.channel.send({
					ephemeral: true,
					embeds: [
						new EmbedBuilder()
							.setColor(Colors.Red)
							.setDescription("There is no song playing right now."),
					],
				});
				setTimeout(() => {
					msg.delete();
				}, 5000);
				return interaction.deferUpdate();
			} else {
				player.paused ? player.resume() : player.pause();
				client.warn(`Player: ${ player.options.guildId } | Successfully ${ player.paused ? "paused" : "resumed" } the player`);
	
				return interaction.update({
					components: [client.createController(player.options.guildId, player)],
				});
			}
		}
	
		if (property === "Next") {
			const song = player.queue.current;
			if (!player.queue.tracks.length) {
				player.stopPlaying();
			} else {
				player.skip();
			}
			
			interaction.channel.send({
				embeds: [
					new EmbedBuilder()
						.setColor(client.config.embedColor)
						.setDescription(`Skipped [**${ song.info.title }**](${ song.info.uri })`),
				],
			});

			return interaction.deferUpdate();
		}
	
		if (property === "Loop") {
			const repeatMode = player.repeatMode === "track" ? "queue" : player.repeatMode === "queue" ? "off" : "track";
			player.setRepeatMode(repeatMode);
			client.warn(`Player: ${player.options.guildId} | Successfully toggled loop ${player.repeatMode} the player`);
	
			interaction.update({
				components: [client.createController(player.options.guildId, player)],
			});
			return;
		}
	
		return interaction.reply({
			ephemeral: true,
			content: "❌ | **Unknown controller option**",
		});
	} catch (err) {
		console.error(err);
	}
};
