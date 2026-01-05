const { EmbedBuilder } = require("discord.js");

/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 * @param {import("discord.js").VoiceState} oldState
 * @param {import("discord.js").VoiceState} newState
 * @returns {Promise<void>}
 */
module.exports = async (client, oldState, newState) => {
	const guildId = newState.guild.id;
	const player = client.manager.players.get(guildId);
	if (!player?.connected) return;

	// Ignore irrelevant updates
	if (!oldState.channel && !newState.channel) return;

	// Bot mute handling
	if (newState.id === client.config.clientId) {
		if (oldState.channelId !== newState.channelId) {
			player.changeVoiceState({ voiceChannelId: newState.channelId });
		}

		if (!oldState.serverMute && newState.serverMute) return player.pause();
		if (oldState.serverMute && !newState.serverMute) return player.resume();

		return;
	}

	// Determine JOIN / LEAVE involving bot channel
	const botChannelId = player.voiceChannelId;
	let type = null;
	let channel = null;

	if (!oldState.channel && newState.channel?.id === botChannelId) {
		type = "JOIN";
		channel = newState.channel;
	} else if (!newState.channel && oldState.channel?.id === botChannelId) {
		type = "LEAVE";
		channel = oldState.channel;
	} else if (
		oldState.channel &&
		newState.channel &&
		oldState.channel.id !== newState.channel.id
	) {
		if (oldState.channel.id === botChannelId) {
			type = "LEAVE";
			channel = oldState.channel;
		} else if (newState.channel.id === botChannelId) {
			type = "JOIN";
			channel = newState.channel;
		}
	}

	if (!type || !channel) return;

	// Update member counts
	player.prevMembers = player.members ?? 0;
	player.members = channel.members.filter(m => !m.user.bot).size;

	// Helpers
	const sendTempEmbed = async (embed, ms = 5000) => {
		const msg = await client.channels.cache
			.get(player.textChannelId)
			.send({ embeds: [embed] });
		setTimeout(() => msg.delete().catch(() => {}), ms);
		return msg;
	};

	const pauseEmbed = new EmbedBuilder()
		.setColor(client.config.embedColor)
		.setTitle("Paused!")
		.setFooter({ text: "Paused because no one is in the voice channel." });

	const resumeEmbed = new EmbedBuilder()
		.setColor(client.config.embedColor)
		.setTitle("Resumed!")
		.setDescription(
			`Playing [${player.queue.current.title}](${player.queue.current.uri})`
		)
		.setFooter({ text: "Playback resumed." });

	const disconnect = async () => {
		const embed = new EmbedBuilder()
			.setColor(client.config.embedColor)
			.setAuthor({ name: "Disconnected!", iconURL: client.config.iconURL })
			.setFooter({ text: "Left because there is no one left in the voice channel." })
			.setTimestamp();

		await sendTempEmbed(embed);
		player.destroy();
		player.set("autoQueue", false);
	};

	// JOIN logic
	if (type === "JOIN") {
		if (
			player.get("autoPause") &&
			player.members === 1 &&
			player.paused &&
			player.members !== player.prevMembers
		) {
			player.resume();
			await sendTempEmbed(resumeEmbed);
		}
		return;
	}

	// LEAVE logic
	if (type === "LEAVE" && player.members === 0) {
		const autoPause = player.get("autoPause");
		const autoLeave = player.get("autoLeave");
		const twentyFourSeven = player.get("twentyFourSeven");

		if (autoPause && player.playing && !player.paused) {
			player.pause();
			await sendTempEmbed(pauseEmbed);
		}

		if (!autoLeave) return;

		if (twentyFourSeven) {
			setTimeout(async () => {
				const members = channel.members.filter(m => !m.user.bot).size;
				if (members === 0 && !player.connected) {
					await disconnect();
				}
			}, client.config.disconnectTime);
		} else {
			await disconnect();
		}
	}
};
