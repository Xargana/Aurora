const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class ServerStatus extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'server_status';
    this.description = 'Fetches server status data';
  }
  
  async execute(interaction) {
    try {
      const isRaw = interaction.options.getBoolean("raw") ?? false;
      const response = await axios.get("https://blahaj.tr:2589/status");

      if (isRaw) {
        await this.sendResponse(interaction, {
          content: `\`\`\`json\n${JSON.stringify(response.data, null, 2)}\n\`\`\``
        });
      } else {
        const fields = [];
        for (const [server, data] of Object.entries(response.data)) {
          const status = data.online ? "🟢 Online" : "🔴 Offline";
          const responseTime = data.responseTime.toFixed(2);
          fields.push({
            name: server,
            value: `Status: ${status}\nResponse Time: ${responseTime}ms`,
            inline: true
          });
        }
        
        const statusEmbed = {
          title: "Server Status",
          color: 0x00ff00,
          fields: fields,
          timestamp: new Date(),
          footer: {
            text: "Server Status Command"
          }
        };
        
        await this.sendResponse(interaction, { embeds: [statusEmbed] });
      }
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to get status.");
    }
  }
}

module.exports = ServerStatus;
