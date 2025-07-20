const { ContextMenuCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, Colors, ApplicationIntegrationType } = require("discord.js");
const escapeMarkdown = require("discord.js").escapeMarkdown;

function extractURLs(text = "") {
  const regex = /https?:\/\/(?:www\.)?[a-zA-Z0-9-%.]+(?:\.[a-zA-Z]{2,6})(?:[\/?][^\s]*)?/g;
  const urls = text.match(regex);
  return urls?.filter?.(url => new URL(url)) ?? undefined;
}

module.exports = {
  command: new ContextMenuCommandBuilder()
  .setName("Play Song")
  .setType(3)
  .setIntegrationTypes([ApplicationIntegrationType.GuildInstall]),

  /**
   * This function will handle context menu interaction
   * @param {import("../lib/DiscordMusicBot")} client
   * @param {import("discord.js").GuildContextMenuInteraction} interaction
   */
  run: async (client, interaction, options) => {
    try {
      const channel = await client.getChannel(client, interaction);
      if (!channel) {
        return;
      }
  
      const node = await client.getLavalink(client);
      if (!node) {
        return interaction.reply({
          embeds: [client.ErrorEmbed("Lavalink node is not connected")],
        });
      }
  
      const player = client.createPlayer(interaction.channel, channel);
  
      if (player.state !== "CONNECTED") {
        player.connect();
      }
  
      if (channel.type == "GUILD_STAGE_VOICE") {
        setTimeout(() => {
          if (interaction.guild.me.voice.suppress == true) {
            try {
              interaction.guild.me.voice.setSuppressed(false);
            } catch (e) {
              interaction.guild.me.voice.setRequestToSpeak(true);
            }
          }
        }, 2000); // Need this because discord api is buggy asf, and without this the bot will not request to speak on a stage - Darren
      }
  
      const ret = await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(":mag_right: **Searching...**"),
        ],
        withResponse: true,
      });
  
      const msg = interaction.channel.messages.cache.get(interaction.targetId).content ?? (await interaction.channel.messages.fetch(interaction.targetId));
      const query = extractURLs(msg)?.[0] ?? msg; 
      const res = await player.search(query, interaction.user).catch((err) => {
        client.error(err);
        return {
          loadType: "LOAD_FAILED",
        };
      });

      switch (res.loadType) {
        case "LOAD_FAILED":
        case "error":
          await interaction
            .editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(Colors.Red)
                  .setDescription("There was an error while searching"),
              ],
            })
            .catch(this.warn);
          break;

        case "NO_MATCHES":
        case "empty":
        await interaction
          .editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("No results were found"),
            ],
          })
          .catch(this.warn);
          break;

        case "TRACK_LOADED":
        case "SEARCH_RESULT":
        case "search":
        case "track":
          player.queue.add(res.tracks[0]);
    
          if (!player.playing && !player.paused && !player.queue.size) {
            player.play();
          }
          var title = escapeMarkdown(res.tracks[0].info.title);
          var title = title.replace(/\]/g, "");
          var title = title.replace(/\[/g, "");
          let addQueueEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({ name: "Added to queue", iconURL: client.config.iconURL })
            .setDescription(`[${title}](${res.tracks[0].info.uri})` || "No Title")
            .setURL(res.tracks[0].info.uri)
            .setThumbnail(res.tracks[0].info.displayThumbnail ? res.tracks[0].info.displayThumbnail("maxresdefault") : res.tracks[0].info.artworkUrl)
            .addFields(
              {
                name: "Added by",
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              {
                name: "Duration",
                value: res.tracks[0].info.isStream
                  ? `\`LIVE 🔴 \``
                  : `\`${client.ms(res.tracks[0].info.duration, {
                      colonNotation: true,
                      secondsDecimalDigits: 0,
                    })}\``,
                inline: true,
              }
            );
    
          if (player.queue.totalSize > 1) {
            addQueueEmbed.addFields({
              name: "Position in queue",
              value: `${player.queue.size}`,
              inline: true,
            });
          }
    
          await interaction.editReply({ embeds: [addQueueEmbed] }).catch(this.warn);
          break;

        case "PLAYLIST_LOADED":
        case "playlist":
          player.queue.add(res.tracks);

          if (
            !player.playing &&
            !player.paused &&
            player.queue.tracks.length === res.tracks.length
          ) {
            player.play();
          }
    
          let playlistEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({
              name: "Playlist added to queue",
              iconURL: client.config.iconURL,
            })
            .setThumbnail(res.tracks[0].info.artworkUrl)
            .setDescription(`[${res.playlist.name}](${query})`)
            .addFields(
              {
                name: "Enqueued",
                value: `\`${res.tracks.length}\` songs`,
                inline: true,
              },
              {
                name: "Playlist duration",
                value: `\`${client.ms(res.playlist.duration, {
                  colonNotation: true,
                  secondsDecimalDigits: 0,
                })}\``,
                inline: true,
              }
            );
    
          await interaction.editReply({ embeds: [playlistEmbed] }).catch(this.warn);
          break;

        default:
          client.error(`Unknown type: ${res.loadType}`);
          await interaction
            .editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(Colors.Red)
                  .setDescription("There is something wrong"),
              ],
            })
            .catch(this.warn);
          break;
      }

      return ret;
    } catch (err) {
      client.error(err.message);
    }
  },
};
