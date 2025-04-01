const CommandBase = require('../../classes/CommandBase');
const ping = require('ping');

class Ping extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'ping';
    this.description = 'Pings a remote server.';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const ip = interaction.options.getString("ip");
      const pingResult = await ping.promise.probe(ip);
      
      if (pingResult.time == "unknown") {
        await this.sendResponse(interaction, {
          content: "Unable to ping the IP address."
        }, true);
        return;
      }
      
      const pingEmbed = {
        title: "Ping Results",
        description: `Results for IP: ${ip}`,
        color: 0x00ff00,
        fields: [
          {
            name: "Response Time",
            value: `${pingResult.time}ms`,
            inline: true
          }
        ],
        timestamp: new Date(),
        footer: {
          text: "Ping Command"
        }
      };
      
      await this.sendResponse(interaction, { embeds: [pingEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to ping.");
    }
  }
}

module.exports = Ping;
