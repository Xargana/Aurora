const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class ServerStatus extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'server_status';
    this.description = 'Fetches server status data';
    this.cooldown = 5; // Set a 5 second cooldown
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const isRaw = interaction.options.getBoolean("raw") ?? false;
      const showServices = interaction.options.getBoolean("services") ?? false;
      const response = await axios.get("https://blahaj.tr:2589/status");
      
      if (isRaw) {
        await this.sendResponse(interaction, {
          content: `\`\`\`json\n${JSON.stringify(response.data, null, 2)}\n\`\`\``
        });
        return;
      }
      
      // Handle the new API format (with servers and pm2Services)
      const serversData = response.data.servers || response.data; // Support both formats
      const pm2ServicesData = response.data.pm2Services || {};
      
      if (showServices && Object.keys(pm2ServicesData).length > 0) {
        // Show PM2 services status
        const fields = [];
        
        for (const [service, data] of Object.entries(pm2ServicesData)) {
          const status = data.status === 'online' ? "🟢 Online" : "🔴 Offline";
          const memory = data.memory ? `${(data.memory / (1024 * 1024)).toFixed(1)} MB` : "N/A";
          
          // Format uptime
          let uptime = "N/A";
          if (data.uptime) {
            const seconds = Math.floor(data.uptime / 1000);
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            uptime = '';
            if (days > 0) uptime += `${days}d `;
            if (hours > 0 || days > 0) uptime += `${hours}h `;
            uptime += `${minutes}m`;
          }
          
          fields.push({
            name: data.name || service,
            value: `Status: ${status}\nMemory: ${memory}\nUptime: ${uptime}\nRestarts: ${data.restarts || 0}`,
            inline: true
          });
        }
        
        const servicesEmbed = {
          title: "PM2 Services Status",
          color: 0x3498db,
          fields: fields,
          timestamp: new Date(),
          footer: {
            text: "PM2 Services Status Command"
          }
        };
        
        await this.sendResponse(interaction, { embeds: [servicesEmbed] });
      } else {
        // Show servers status
        const fields = [];
        
        for (const [server, data] of Object.entries(serversData)) {
          const status = data.online ? "🟢 Online" : "🔴 Offline";
          const responseTime = data.responseTime ? `${data.responseTime.toFixed(2)}ms` : "N/A";
          
          fields.push({
            name: server,
            value: `Status: ${status}\nResponse Time: ${responseTime}`,
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
      await this.sendErrorResponse(interaction, "Failed to get status. The status server may be down.");
    }
  }
}

module.exports = ServerStatus;
