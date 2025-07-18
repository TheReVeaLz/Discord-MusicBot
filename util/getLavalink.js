/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 * @returns {import("erela.js").Node | undefined}
 */
module.exports = async (client) => {
  return new Promise((resolve) => {
    for (let i = 0; i < client.manager.nodeManager.nodes.size; i++) {
      client.manager.nodeManager.nodes.forEach((node) => {
        if (node.connected) resolve(node);
      });
    }
    resolve(undefined);
  });
};
