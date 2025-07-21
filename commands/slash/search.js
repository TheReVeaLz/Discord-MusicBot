const SlashCommand = require("../../lib/SlashCommand");
const prettyMilliseconds = require("pretty-ms").default;
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Colors,
  ApplicationIntegrationType
} = require("discord.js");

const command = new SlashCommand()
  .setName("search")
  .setDescription("Search for a song")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("The song to search for")
      .setRequired(true)
  )
  .setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
	.setRun(async (client, interaction, options) => {
    try {
      const channel = await client.getChannel(client, interaction);
      if (!channel) {
        return;
      }

      let player;
      if (client.manager) {
        player = client.createPlayer(interaction.channel, channel);
      } else {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Red)
              .setDescription("Lavalink node is not connected"),
          ],
        });
      }
      await interaction.deferReply().catch((_) => {});

      if (player.state !== "CONNECTED") {
        player.connect();
      }

      const search = interaction.options.getString("query");
      const res = await player.search(search, interaction.user);
      switch (res.loadType) {
        case "LOAD_FAILED":
        case "error":
          interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription("An error occured while searching for the song")
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          break;
        case "NO_MATCHES":
        case "empty":
          interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(`No results found for \`${search}\``)
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          break;
        case "TRACK_LOADED":
        case "SEARCH_RESULT":
        case "search":
        case "track":
          let max = 10;
          if (res.tracks.length < max) {
            max = res.tracks.length;
          }
    
          let resultFromSearch = [];
    
          res.tracks.slice(0, max).map((track) => {
            resultFromSearch.push({
              label: `${track.info.title}`,
              value: `${track.info.uri}`,
              description: track.info.isStream
                ? `LIVE`
                : `${prettyMilliseconds(track.info.duration, {
                    secondsDecimalDigits: 0,
                  })} - ${track.info.author}`,
            });
          });
    
          const menus = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("select")
              .setPlaceholder("Select a song")
              .addOptions(resultFromSearch)
          );
    
          let choosenTracks = await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription(
                  `Here are some of the results I found for \`${search}\`. Please select track within \`30 seconds\``
                ),
            ],
            components: [menus],
          });
          const filter = (button) => button.user.id === interaction.user.id;
    
          const tracksCollector = choosenTracks.createMessageComponentCollector({
            filter,
            time: 30000,
          });
          tracksCollector.on("collect", async (i) => {
            if (i.isStringSelectMenu()) {
              await i.deferUpdate();
              let uriFromCollector = i.values[0];
              let selectedTrack = res.tracks.find(track => track.info.uri === uriFromCollector);
              player?.queue?.add(selectedTrack);
              if (!player?.playing && !player?.paused && !player?.queue?.size) {
                player?.play();
              }
              i.editReply({
                content: null,
                embeds: [
                  new EmbedBuilder()
                    .setAuthor({
                      name: "Added to queue",
                      iconURL: client.config.iconURL,
                    })
                    .setURL(selectedTrack.info.uri)
                    .setThumbnail(selectedTrack.info.artworkUrl)
                    .setDescription(
                      `[${selectedTrack?.info.title}](${selectedTrack?.info.uri})` ||
                        "No Title"
                    )
                    .addFields(
                      {
                        name: "Added by",
                        value: `<@${interaction.user.id}>`,
                        inline: true,
                      },
                      {
                        name: "Duration",
                        value: selectedTrack.info.isStream
                          ? `\`LIVE :red_circle:\``
                          : `\`${client.ms(selectedTrack.info.duration, {
                              colonNotation: true,
                            })}\``,
                        inline: true,
                      }
                    )
                    .setColor(client.config.embedColor),
                ],
                components: [],
              });
            }
          });
          tracksCollector.on("end", async (i) => {
            if (i.size == 0) {
              choosenTracks.edit({
                content: null,
                embeds: [
                  new EmbedBuilder()
                    .setDescription(
                      `No track selected. You took too long to select a track.`
                    )
                    .setColor(client.config.embedColor),
                ],
                components: [],
              });
            }
          });
          break;
        case "PLAYLIST_LOADED":
        case "playlist":
          break;
        default:
          client.error(`Unknown type: ${res.loadType}`);
          interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("An error occured while searching for the song"),
            ],
          }).catch(this.warn);
          break;
      }
    } catch (err) {
      client.error(`Unknown error: ${err}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: "An error occured while searching for the song",
            })
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    }
  });

module.exports = command;
