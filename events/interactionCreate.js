const Controller = require("../util/Controller");
const yt = require("youtube-sr").default;

/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 * @param {import("discord.js").Interaction}interaction
 */
module.exports = async (client, interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            let command = client.slashCommands.find(
                (x) => x.name == interaction.commandName,
            );
            if (!command || !command.run) {
                return interaction.reply(
                    "Sorry the command you used doesn't have any run function",
                );
            }
            client.commandsRan++;
            command.run(client, interaction, interaction.options);
            return;
        }
    
        if (interaction.isContextMenuCommand()) {
            let command = client.contextCommands.find(
                (x) => x.command.name == interaction.commandName,
            );
            if (!command || !command.run) {
                return interaction.reply(
                    "Sorry the command you used doesn't have any run function",
                );
            }
            client.commandsRan++;
            command.run(client, interaction, interaction.options);
            return;
        }
    
        if (interaction.isButton()) {
            if (interaction.customId.startsWith("controller")) {
                Controller(client, interaction);
            }
        }
    
        if (interaction.isAutocomplete()) {
            const url = interaction.options.getString("query")
            if (url.length < 3) return interaction.respond([]).catch(() => { });
    
            const match = [
                /^((?:https?:)?\/\/)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be)\/[\w\-?=&]+/,
                /^(?:spotify:|(?:https?:\/\/)?[a-z]+\.spotify\.com\/(?:track\/|playlist\/|user\/.*\/playlist\/)).+/,
                /^((?:https?:)?\/\/)?(?:www\.)?deezer\.com\/[a-z]+\/(?:track|album|playlist)\/\d+/,
                /^((?:https?:)?\/\/)?(?:www\.|m\.)?soundcloud\.com\/.+/,
                /^((?:https?:)?\/\/)?music\.apple\.com\/.+\/(?:artist|album|music-video|playlist)\/.+/
            ].some(function (match) {
                return match.test(url) == true;
            });
            // const Random = "ytsearch"[Math.floor(Math.random() * "ytsearch".length)];
            const Random = String.fromCharCode(0x41 + Math.floor(Math.random() * 0x1A));
    
            if (["play", "playnext"].includes(interaction.commandName)) {
                // Return the url back if it's match to the pattern
                if (match == true) {
                    let choice = []
                    choice.push({ name: url, value: url })
                    return await interaction.respond(choice).catch(() => { });
                }

                try {
                    const result = await yt.search(url || Random, {
                        safeSearch: false,
                        limit: 25
                    });

                    const choice = result.map(x => ({ name: `[${x.durationFormatted}] ${x.title}`.slice(0, 100), value: x.url }));
                    return await interaction.respond(choice).catch(() => { });
                } catch (err) {
                    console.log(err);
                    return interaction.respond([]).catch(() => { });
                }
            } else if (result.loadType === "LOAD_FAILED" || "NO_MATCHES")
                return;
        }
    } catch (err) {
        console.log(err.message);
    }
};
