const { Player, Track } = require("lavalink-client");
const Client = require("../DiscordMusicBot")
const youtubesr = require("youtube-sr").default;

/**
* @param {Player} player
* @param {Track} track
* @returns {void}
*/
async function youtubeHandler(player, track) {
  const identifier = track.info.identifier;
  const search = await youtubesr.searchNextMusic(identifier, { limit: 25 });
  
  let playedTracks = player.get("playedTracks");
  async function addNextSong() {
    let tryTime = 0
    let errRet;
    while (tryTime < 3) {
      try {
        const nextTrackIndex = Math.max(search.findIndex(t => !playedTracks.includes(t.id)), 0);
        const res = await player.search(search[nextTrackIndex].url, player.get("requester"));
        player.queue.add(res.tracks[0]);
        break;
      } catch (err) {
        tryTime++;
        errRet = err;
      }
    }

    if (!player.queue.tracks.length && errRet) {
      player.destroy();
      throw errRet
    }
  }
  
  return await addNextSong()
}


/**
* @param {Player} player
* @param {Track} track
* @returns {void}
*/
async function autoPlayHandler(player, track) {
  switch (track?.info?.sourceName) {
    case "youtube":
    case "youtubemusic":
      return await youtubeHandler(player, track);
    default:
      throw new Error(`No autoplay handler for [${track?.info?.sourceName}] source`)
  }
}

/**
* @param {Client} client
* @param {Player} player
* @param {Track} track
* @returns {void}
*/
async function autoPlayFunction(client, player, track){
  const autoQueue = player.get("autoQueue");
  
  if (autoQueue) {
    try {
      await autoPlayHandler(player, track)
    } catch (err) {
      client.error(err);
      return player.destroy();
    }
  } else {
    const twentyFourSeven = player.get("twentyFourSeven");
    try {
      if (!player.playing && !twentyFourSeven) {
        setTimeout(async () => {
          if (!player.playing && player.state !== "DISCONNECTED") {
            let disconnectedEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({
              name: "Disconnected!",
              iconURL: client.config.iconURL,
            })
            .setDescription(
              `The player has been disconnected due to inactivity.`
            );
            let Disconnected = await client.channels.cache
            .get(player.textChannelId)
            .send({ embeds: [disconnectedEmbed] });
            setTimeout(() => Disconnected.delete(true), 6000);
            player.destroy();
          } else if (player.playing) {
            client.warn(
              `Player: ${player.options.guildId} | Still playing`
            );
          }
        }, client.config.disconnectTime);
      } else if (!player.playing && twentyFourSeven) {
        client.warn(
          `Player: ${
            player.options.guildId
          } | Queue has ended [${colors.blue("24/7 ENABLED")}]`
        );
      } else {
        client.warn(
          `Something unexpected happened with player ${player.options.guildId}`
        );
      }
      player.setNowplayingMessage(client, null);
    } catch (err) {
      client.error(err);
    }
  }
}

module.exports = autoPlayFunction;