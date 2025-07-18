module.exports = {
  apps: [
    {
      name: "Bot",
      script: ".",
      instances: 0,
      env: {
        token: "",
        clientSecret: "",
        clientId: "",
        spotifyId: "",
        spotifySecret: "",
        LAVALINK_HOST: "",
        LAVALINK_PORT: 80,
        LAVALINK_PASSWORD: "",
        LAVALINK_SECURE: false
      }
    },
    {
      name: "Bot2",
      script: ".",
      instances: 0,
      env_bot2: {
        token: "",
        clientSecret: "",
        clientId: "",
        spotifyId: "",
        spotifySecret: "",
        LAVALINK_HOST: "",
        LAVALINK_PORT: 80,
        LAVALINK_PASSWORD: "",
        LAVALINK_SECURE: false
      }
    }
  ]
};
