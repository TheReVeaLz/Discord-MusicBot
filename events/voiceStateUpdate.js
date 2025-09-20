const { EmbedBuilder } = require("discord.js");

/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 * @param {import("discord.js").VoiceState} oldState
 * @param {import("discord.js").VoiceState} newState
 * @returns {Promise<void>}
 */
module.exports = async (client, oldState, newState) => {
	// get guild and player
	let guildId = newState.guild.id;
	const player = client.manager.players.get(guildId);
	
	if (!player || !player.connected) return; // check if the bot is active (playing, paused or empty does not matter (return otherwise)
	if (oldState.channel === null && newState.channel === null) return;
	
	// Mute switch
	if (newState.serverMute == true && oldState.serverMute == false && newState.id === client.config.clientId) return player.pause();
	if (newState.serverMute == false && oldState.serverMute == true && newState.id === client.config.clientId) return player.resume();
	
	const stateChange = {};
	// get the state change
	if (oldState.channel === null && newState.channel !== null) {
		stateChange.type = "JOIN";
	} else if (oldState.channel !== null && newState.channel === null) {
		stateChange.type = "LEAVE";
	} else if (oldState.channel !== null && newState.channel !== null) {
		// move
		if (oldState.channel.id === player.voiceChannelId) {
			stateChange.type = "LEAVE";
		} else if (newState.channel.id === player.voiceChannelId) {
			stateChange.type = "JOIN";
		}
	}

	// assign channel property
	if (stateChange.type === "JOIN") {
		stateChange.channel = newState.channel;
	} else if (stateChange.type === "LEAVE") {
		stateChange.channel = oldState.channel;
	}

	if (!stateChange.channel || stateChange.channel.id !== player.voiceChannelId) return; // check if the bot's voice channel is involved (return otherwise)

	player.prevMembers = player.members
	player.members = stateChange.channel.members.filter(member => !member.user.bot).size;
	switch (stateChange.type) {
		case "JOIN":
			if (player.get("autoPause") === true) {
		            if (player.members === 1 && player.paused && player.members !== player.prevMembers){
					player.resume();
					let playerResumed = new EmbedBuilder()
						.setColor(client.config.embedColor)
						.setTitle(`Resumed!`, client.config.iconURL)
						.setDescription(
							`Playing  [${ player.queue.current.title }](${ player.queue.current.uri })`,
						)
						.setFooter({ text: `The current song has been resumed.` });
					
					let resumeMessage = await client.channels.cache
						.get(player.textChannelId)
						.send({ embeds: [playerResumed] });
					player.setResumeMessage(client, resumeMessage);
					
					setTimeout(() => {
						if (!client.isMessageDeleted(resumeMessage)) {
							resumeMessage.delete();
							client.markMessageAsDeleted(resumeMessage);
						}
					}, 5000);
				}
			}
			break;
		case "LEAVE":
			const twentyFourSeven = player.get("twentyFourSeven");
			if (player.get("autoPause") === true && player.get("autoLeave") === false) {
				if (player.members === 0 && !player.paused && player.playing) {
					player.pause();
					
					let playerPaused = new EmbedBuilder()
						.setColor(client.config.embedColor)
						.setTitle(`Paused!`, client.config.iconURL)
						.setFooter({
							text: `The current song has been paused because theres no one in the voice channel.`,
						});
					
					let pausedMessage = await client.channels.cache
						.get(player.textChannelId)
						.send({ embeds: [playerPaused] });
					player.setPausedMessage(client, pausedMessage);
				}
			} else if (player.get("autoLeave") === true && player.get("autoPause") === false) {
				if (player.members === 0) {
					if (twentyFourSeven){
						setTimeout(async () => {
							var members = stateChange.channel.members.filter(member => !member.user.bot).size
							if (members === 0 && !player.connected){
								let leftEmbed = new EmbedBuilder()
									.setColor(client.config.embedColor)
									.setAuthor({
									name: "Disconnected!",
									iconURL: client.config.iconURL,
									})
									.setFooter({ text: "Left because there is no one left in the voice channel." })
									.setTimestamp();
								let Disconnected = await client.channels.cache
									.get(player.textChannelId)
									.send({ embeds: [leftEmbed] });
								setTimeout(() => Disconnected.delete(true), 5000);
								player.queue.clear();
								player.destroy();
								player.set("autoQueue", false);
							}
						}, client.config.disconnectTime);
					} else {
						let leftEmbed = new EmbedBuilder()
							.setColor(client.config.embedColor)
							.setAuthor({
							name: "Disconnected!",
							iconURL: client.config.iconURL,
							})
							.setFooter({ text: "Left because there is no one left in the voice channel." })
							.setTimestamp();
						let Disconnected = await client.channels.cache
							.get(player.textChannelId)
							.send({ embeds: [leftEmbed] });
						setTimeout(() => Disconnected.delete(true), 5000);
						player.destroy();	
					}
					
				}
			} else if (player.get("autoLeave") === true && player.get("autoPause") === true){
				if (members === 0 && !player.paused && player.playing && twentyFourSeven) {
					player.pause();
					
					let playerPaused = new EmbedBuilder()
						.setColor(client.config.embedColor)
						.setTitle(`Paused!`, client.config.iconURL)
						.setFooter({
							text: `The current song has been paused because theres no one in the voice channel.`,
						});
					
					let pausedMessage = await client.channels.cache
						.get(player.textChannelId)
						.send({ embeds: [playerPaused] });
					player.setPausedMessage(client, pausedMessage);
					setTimeout(async () => {
						var members = stateChange.channel.members.filter(member => !member.user.bot).size
						if (members === 0 && !player.connected){
							let leftEmbed = new EmbedBuilder()
								.setColor(client.config.embedColor)
								.setAuthor({
								name: "Disconnected!",
								iconURL: client.config.iconURL,
								})
								.setFooter({ text: "Left because there is no one left in the voice channel." })
								.setTimestamp();
							let Disconnected = await client.channels.cache
								.get(player.textChannelId)
								.send({ embeds: [leftEmbed] });
							setTimeout(() => Disconnected.delete(true), 5000);
							pausedMessage.delete(true);
							player.queue.clear();
							player.destroy();
							player.set("autoQueue", false);
						}
					}, client.config.disconnectTime);
				} else {
					if (members === 0 && !player.connected){
						let leftEmbed = new EmbedBuilder()
						.setColor(client.config.embedColor)
						.setAuthor({
						name: "Disconnected!",
						iconURL: client.config.iconURL,
						})
						.setFooter({ text: "Left because there is no one left in the voice channel." })
						.setTimestamp();
						let Disconnected = await client.channels.cache
							.get(player.textChannelId)
							.send({ embeds: [leftEmbed] });
						setTimeout(() => Disconnected.delete(true), 5000);
						player.destroy();
					}
				}
			}
			break;
	}
};
