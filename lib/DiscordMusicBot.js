const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors
} = require("discord.js");
const escapeMarkdown = require('discord.js').escapeMarkdown;
const fs = require("fs");
const path = require("path");
const prettyMilliseconds = require("pretty-ms").default;
const jsoning = require("jsoning").Jsoning; // Documentation: https://jsoning.js.org/
const ConfigFetcher = require("../util/getConfig");
const Logger = require("./Logger");
const { LavalinkManager: Manager } = require("lavalink-client");
const Server = require("../api");
const getLavalink = require("../util/getLavalink");
const getChannel = require("../util/getChannel");
const colors = require("colors");
const { default: EpicPlayer } = require("./EpicPlayer");
const PlayerEvent = require("./PlayerEvent");

class DiscordMusicBot extends Client {
  /**
   * Create the music client
   * @param {import("discord.js").ClientOptions} props - Client options
   */
  constructor(
    props = {
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
      ],
    }
  ) {
    super(props);

    ConfigFetcher().then((conf) => {
      this.config = conf;
      this.options.presence = conf.presence;
      this.build();
    });

    //Load Events and stuff
    /**@type {Collection<string, import("./SlashCommand")} */
    this.slashCommands = new Collection();
    this.contextCommands = new Collection();

    this.logger = new Logger(path.join(__dirname, "..", "logs.log"));

    this.LoadCommands();
    this.LoadEvents();

    this.database = new jsoning("db.json");

    this.deletedMessages = new WeakSet();
    this.getLavalink = getLavalink;
    this.getChannel = getChannel;
    this.ms = prettyMilliseconds;
    this.commandsRan = 0;
    this.songsPlayed = 0;
  }

  /**
   * Send an info message
   * @param {string} text
   */
  log(text) {
    this.logger.log(text);
  }

  /**
   * Send an warning message
   * @param {string} text
   */
  warn(text) {
    this.logger.warn(text);
  }

  /**
   * Send an error message
   * @param {string} text
   */
  error(text) {
    this.logger.error(text);
  }

  /**
   * Build em
   */
  build() {
    let client = this;
    this.warn("Started the bot...");
    this.login(this.config.token);
    this.server = this.config.website?.length ? new Server(this) : null; // constructing also starts it; Do not start server when no website configured
    if (this.config.debug === true) {
      this.warn("Debug mode is enabled!");
      this.warn("Only enable this if you know what you are doing!");
      process.on("unhandledRejection", (error) => console.log(error));
      process.on("uncaughtException", (error) => console.log(error));
    } else {
      process.on("unhandledRejection", (error) => {
        return;
      });
      process.on("uncaughtException", (error) => {
        return;
      });
      process.on("SIGINT", async function () {
        client.log("Exit");
        const promises = [];
        client.manager.players.forEach(player => promises.push(player.destroy()));
        
        await Promise.allSettled(promises);
        await client.destroy();
        process.exit();
      });
    }

    /**
     * will hold at most 100 tracks, for the sake of autoqueue
     */

    this.manager = new Manager({
      autoPlay: true,
      nodes: this.config.nodes,
      retryDelay: this.config.retryDelay,
      retryAmount: this.config.retryAmount,
      clientName: `DiscordMusic/v${require("../package.json").version} (Bot: ${
        this.config.clientId
      })`,
      playerOptions: {
        onEmptyQueue: {
          destroyAfterMs: 30_000,
          autoPlayFunction: PlayerEvent.autoPlayFunction.bind(null, client)
        }
      },
      sendToShard: (id, payload) => client.guilds.cache.get(id)?.shard?.send(payload),
    });

    this.manager.nodeManager
      .on("connect", (node) => {
          this.log(
            `Node: ${node.options.id} | Lavalink node is connected.`
          )
          node.updateSession(true, 20);
          node.options.sessionId = node.sessionId;
        }
      )
      .on("reconnecting", (node) =>
        this.warn(
          `Node: ${node.options.id} | Lavalink node is reconnecting.`
        )
      )
      .on("destroy", (node) =>
        this.warn(
          `Node: ${node.options.id} | Lavalink node is destroyed.`
        )
      )
      .on("disconnect", (node) =>
        this.warn(
          `Node: ${node.options.id} | Lavalink node is disconnected.`
        )
      )
      .on("error", (node, err) => {
        this.warn(
          `Node: ${node.options.id} | Lavalink node has an error: ${err.message}.`
        );
      })
      .on("resumed", async (node, payload, players) => {
        try {
          this.log(`Node: ${node.options.id} | Lavalink node is resumed.`);
          // if (!Array.isArray(players)) return this.error("Players is not an array", players);
  
          // for (const data of players) {
          //   const prevPlayer = this.manager.players.get(data.guildId);
          //   if (!prevPlayer) {
          //       this.error("Player not found.")
          //       continue;
          //   }
          //   this.warn(`Player: ${player.guildId} | Player resuming.`)
          //   if (!data.state.connected) continue

          //   const player = this.createPlayer({
          //       guildId: prevPlayer.guildId,
          //       voiceChannelId: prevPlayer.voiceChannelId,
          //       textChannelId: prevPlayer.textChannelId,
          //       selfDeaf: prevPlayer.options?.selfDeaf,
          //       selfMute: prevPlayer.options?.selfMute
          //   });
            
          //   await player.connect();
          //   player.filterManager.data = data.filters;
          //   await player.queue.utils.sync(true, false).catch(this.warn);
          //   if (data.track) player.queue.current = client.lavalink.utils.buildTrack(data.track, player.queue.current?.requester || client.user);
          //   player.lastPosition = data.state.position;
          //   player.lastPositionChange = Date.now();
          //   player.ping.lavalink = data.state.ping;
          //   // important to have skipping work correctly later
          //   player.paused = data.paused;
          //   player.playing = !data.paused && !!data.track;
          //   this.log(`Player: ${player.guildId} | Player resumed.`)
          // }
        } catch (err) {
          this.error(err.message);
        }
      })
      .on("raw", (node, payload) => {
        switch (payload.op) {
          case "ready":
            if (!payload.resumed) {
              for (const [guildId, player] of this.manager.players.entries()) {
                this.warn(`Player: ${guildId} | Destroy not resumed player.`)
                player.destroy();
              }
            }
            break;
        }
      });

      this.manager
      // on track error warn and create embed
      .on("trackError", (player, err) => {
        this.warn(
          `Player: ${player.options.guildId} | Track had an error: ${err.message}.`
        );
        //console.log(err);
        // let song = player.queue.current;
        // var title = escapeMarkdown(song.title)
        // var title = title.replace(/\]/g,"")
        // var title = title.replace(/\[/g,"")
        
        // let errorEmbed = new EmbedBuilder()
        //   .setColor(Colors.Red)
        //   .setTitle("Playback error!")
        //   .setDescription(`Failed to load track: \`${title}\``)
        //   .setFooter({
        //     text: "Oops! something went wrong but it's not your fault!",
        //   });
        // client.channels.cache
        //   .get(player.textChannelId)
        //   .send({ embeds: [errorEmbed] });
      })

      .on("trackStuck", (player, err) => {
        this.warn(`Track has an error: ${err.message}`);
        //console.log(err);
        // let song = player.queue.current;
        // var title = escapeMarkdown(song.title)
        // var title = title.replace(/\]/g,"")
        // var title = title.replace(/\[/g,"")
        
        // let errorEmbed = new EmbedBuilder()
        //   .setColor(Colors.Red)
        //   .setTitle("Track error!")
        //   .setDescription(`Failed to load track: \`${title}\``)
        //   .setFooter({
        //     text: "Oops! something went wrong but it's not your fault!",
        //   });
        // client.channels.cache
        //   .get(player.textChannelId)
        //   .send({ embeds: [errorEmbed] });
      })
      .on("playerMove", (player, oldChannel, newChannel) => {
        const guild = client.guilds.cache.get(player.guild);
        if (!guild) {
          return;
        }
        const channel = guild.channels.cache.get(player.textChannelId);
        if (oldChannel === newChannel) {
          return;
        }
        if (newChannel === null || !newChannel) {
          if (!player) {
            return;
          }
          if (channel) {
            channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(client.config.embedColor)
                  .setDescription(`Disconnected from <#${oldChannel}>`),
              ],
            });
          }
          return player.destroy();
        } else {
          player.voiceChannel = newChannel;
          setTimeout(() => player.pause(false), 1000);
          return undefined;
        }
      })
      .on("playerCreate", (player) => {
        player.set("twentyFourSeven", client.config.twentyFourSeven);
        player.set("autoQueue", client.config.autoQueue);
        player.set("autoPause", client.config.autoPause);
        player.set("autoLeave", client.config.autoLeave);
        player.set("playedTracks", []);
        this.warn(
          `Player: ${
            player.options.guildId
          } | A wild player has been created in ${
            client.guilds.cache.get(player.options.guildId)
              ? client.guilds.cache.get(player.options.guildId).name
              : "a guild"
          }`
        );
      })
      .on("playerDestroy", (player) => {
        this.warn(
          `Player: ${player.options.guildId} | A wild player has been destroyed in ${client.guilds.cache.get(player.options.guildId)
              ? client.guilds.cache.get(player.options.guildId).name
              : "a guild"
          }`
        )
        player.setNowplayingMessage(client, null);
      })
      // on LOAD_FAILED send error message
      .on("loadFailed", (node, type, error) =>
        this.warn(
          `Node: ${node.options.id} | Failed to load ${type}: ${error.message}`
        )
      )
      // on TRACK_START send message
      .on(
        "trackStart",
        /** @param {EpicPlayer} player */ async (player, track) => {
          try {
            
            this.songsPlayed++;
            let playedTracks = player.get("playedTracks");
            playedTracks.push(track.info.identifier);
            if (playedTracks.length >= 20) {
              playedTracks.splice(0, playedTracks.length - 20);
            }
  
            this.warn(
              `Player: ${
                player.options.guildId
              } | Track has been started playing [${colors.blue(track.info.title)}]`
            );
            var title = escapeMarkdown(track.info.title)
            var title = title.replace(/\]/g,"")
            var title = title.replace(/\[/g,"")
            let trackStartedEmbed = this.Embed()
              .setAuthor({ name: "Now playing", iconURL: this.config.iconURL })
              .setDescription(
                `[${title}](${track.info.uri})` || "No Descriptions"
              )
              .addFields(
                {
                  name: "Requested by",
                  value: `${track.requester || `<@${client.user.id}>`}`,
                  inline: true,
                },
                {
                  name: "Duration",
                  value: track.info.isStream
                    ? `\`LIVE\``
                    : `\`${prettyMilliseconds(track.info.duration, {
                        colonNotation: true,
                      })}\``,
                  inline: true,
                }
              )
              .setThumbnail(track.info.artworkUrl);
            let nowPlaying = await client.channels.cache
              .get(player.textChannelId)
              .send({
                embeds: [trackStartedEmbed],
                components: [
                  client.createController(player.options.guildId, player),
                ],
              })
              .catch(this.warn);
            player.setNowplayingMessage(client, nowPlaying);
          } catch (err) {
            console.error(err);
          }
       }
      )
    
      .on(
        "playerDisconnect",
          /** @param {EpicPlayer} */ async (player) => {
            if (player.twentyFourSeven) {
              player.queue.clear();
              player.skip();
              player.set("autoQueue", false);
            } else {
              player.destroy();
            }
          }
      )
  }

  /**
   * Checks if a message has been deleted during the run time of the Bot
   * @param {Message} message
   * @returns
   */
  isMessageDeleted(message) {
    return this.deletedMessages.has(message);
  }

  /**
   * Marks (adds) a message on the client's `deletedMessages` WeakSet so it's
   * state can be seen through the code
   * @param {Message} message
   */
  markMessageAsDeleted(message) {
    this.deletedMessages.add(message);
  }

  /**
   *
   * @param {string} text
   * @returns {EmbedBuilder}
   */
  Embed(text) {
    let embed = new EmbedBuilder().setColor(this.config.embedColor);

    if (text) {
      embed.setDescription(text);
    }

    return embed;
  }

  /**
   *
   * @param {string} text
   * @returns {EmbedBuilder}
   */
  ErrorEmbed(text) {
    let embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription("❌ | " + text);

    return embed;
  }

  LoadEvents() {
    let EventsDir = path.join(__dirname, "..", "events");
    fs.readdir(EventsDir, (err, files) => {
      if (err) {
        throw err;
      } else {
        files.forEach((file) => {
          const event = require(EventsDir + "/" + file);
          this.on(file.split(".")[0], event.bind(null, this));
          this.warn("Event Loaded: " + file.split(".")[0]);
        });
      }
    });
  }

  LoadCommands() {
    let SlashCommandsDirectory = path.join(
      __dirname,
      "..",
      "commands",
      "slash"
    );
    fs.readdir(SlashCommandsDirectory, (err, files) => {
      if (err) {
        throw err;
      } else {
        files.forEach((file) => {
          let cmd = require(SlashCommandsDirectory + "/" + file);

          if (!cmd || !cmd.run) {
            return this.warn(
              "Unable to load Command: " +
                file.split(".")[0] +
                ", File doesn't have an valid command with run function"
            );
          }
          this.slashCommands.set(file.split(".")[0].toLowerCase(), cmd);
          this.log("Slash Command Loaded: " + file.split(".")[0]);
        });
      }
    });

    let ContextCommandsDirectory = path.join(
      __dirname,
      "..",
      "commands",
      "context"
    );
    fs.readdir(ContextCommandsDirectory, (err, files) => {
      if (err) {
        throw err;
      } else {
        files.forEach((file) => {
          let cmd = require(ContextCommandsDirectory + "/" + file);
          if (!cmd.command || !cmd.run) {
            return this.warn(
              "Unable to load Command: " +
                file.split(".")[0] +
                ", File doesn't have either command/run"
            );
          }
          this.contextCommands.set(file.split(".")[0].toLowerCase(), cmd);
          this.log("ContextMenu Loaded: " + file.split(".")[0]);
        });
      }
    });
  }

  /**
   *
   * @param {import("discord.js").TextChannel} textChannel
   * @param {import("discord.js").VoiceChannel} voiceChannel
   */
  createPlayer(textChannel, voiceChannel) {
    const player = this.manager.createPlayer({
      guildId: textChannel.guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel.id,
      selfDeaf: this.config.serverDeafen,
      volume: this.config.defaultVolume,
    });
    
    player.textChannelId = textChannel.id;
    return player;
  }

  createController(guild, player) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`controller:${guild}:Stop`)
        .setEmoji("⏹️"),

      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`controller:${guild}:Replay`)
        .setEmoji("⏮️"),

      new ButtonBuilder()
        .setStyle(player.playing ? ButtonStyle.Primary : ButtonStyle.Danger)
        .setCustomId(`controller:${guild}:PlayAndPause`)
        .setEmoji(player.playing ? "⏸️" : "▶️"),

      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`controller:${guild}:Next`)
        .setEmoji("⏭️"),

      new ButtonBuilder()
        .setStyle(
          player.repeatMode === "track"
            ? ButtonStyle.Success
            : player.repeatMode === "queue"
            ? ButtonStyle.Success
            : ButtonStyle.Danger
        )
        .setCustomId(`controller:${guild}:Loop`)
        .setEmoji(player.repeatMode === "track" ? "🔂" : "🔁")
    );
  }
}

module.exports = DiscordMusicBot;
