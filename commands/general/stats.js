const CommandBase = require('../../classes/CommandBase');
const os = require('os');

class Stats extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'stats';
    this.description = 'Show bot and server statistics';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      
      // Calculate uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      // Get system info
      const memUsage = process.memoryUsage();
      const cpuLoad = os.loadavg();
      
      const statsEmbed = {
        title: "Bot Statistics",
        color: 0x7289DA,
        fields: [
          {
            name: "Bot Info",
            value: [
              `**Servers:** ${this.client.guilds.cache.size}`,
              `**Users:** ${this.client.users.cache.size}`,
              `**Channels:** ${this.client.channels.cache.size}`,
              `**Commands:** ${this.client.application.commands.cache.size}`
            ].join('\n'),
            inline: true
          },
          {
            name: "System Info",
            value: [
              `**Platform:** ${os.platform()}`,
              `**Memory Usage:** ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
              `**CPU Load:** ${cpuLoad[0].toFixed(2)}%`,
              `**Node.js:** ${process.version}`
            ].join('\n'),
            inline: true
          },
          {
            name: "Uptime",
            value: `${days}d ${hours}h ${minutes}m`,
            inline: true
          }
        ],
        timestamp: new Date(),
        footer: { text: "Aurora" }
      };
      
      await this.sendResponse(interaction, { embeds: [statsEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to fetch statistics.");
    }
  }
}

module.exports = Stats;
