const CommandBase = require('../../classes/CommandBase');
const { version } = require('../../package.json');
const os = require('os');
const djs = require('discord.js');

class Info extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'info';
    this.description = 'Display information about the bot';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      
      // Calculate bot uptime
      const botUptime = process.uptime();
      const botDays = Math.floor(botUptime / 86400);
      const botHours = Math.floor((botUptime % 86400) / 3600);
      const botMinutes = Math.floor((botUptime % 3600) / 60);
      const botSeconds = Math.floor(botUptime % 60);
      
      // Format bot uptime string
      const botUptimeString = `${botDays}d ${botHours}h ${botMinutes}m ${botSeconds}s`;
      
      // Calculate system uptime
      const sysUptime = os.uptime();
      const sysDays = Math.floor(sysUptime / 86400);
      const sysHours = Math.floor((sysUptime % 86400) / 3600);
      const sysMinutes = Math.floor((sysUptime % 3600) / 60);
      const sysSeconds = Math.floor(sysUptime % 60);
      
      // Format system uptime string
      const sysUptimeString = `${sysDays}d ${sysHours}h ${sysMinutes}m ${sysSeconds}s`;
      
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      
      // Get CPU load (from stats.js)
      const cpuLoad = os.loadavg();
      
      // Get server count and additional stats
      const serverCount = this.client.guilds.cache.size;
      const channelCount = this.client.channels.cache.size;

      
      // Create embed
      const infoEmbed = {
        title: `${this.client.user.username} Info`,
        description: "A multi-purpose utility bot with various tools and commands",
        color: 0x3498db,
        thumbnail: {
          url: this.client.user.displayAvatarURL({ dynamic: true })
        },
        fields: [
          {
            name: "Bot Stats",
            value: [
              `**Servers:** ${serverCount}`,
              `**Channels:** ${channelCount}`,
              `**Commands:** ${this.client.application.commands.cache.size || "Loading..."}`,
              `**Bot Uptime:** ${botUptimeString}`
            ].join('\n'),
            inline: true
          },
          {
            name: "System Info",
            value: [
              `**Platform:** ${os.platform()} ${os.release()}`,
              `**Memory:** ${memoryUsedMB}MB / ${memoryTotalMB}MB`,
              `**CPU Load:** ${cpuLoad[0].toFixed(2)}%`,
              `**Node.js:** ${process.version}`,
              `**Bot Version:** ${version || "1.0.0"}`,
              `**System Uptime:** ${sysUptimeString}`
            ].join('\n'),
            inline: true
          },
          {
            name: "Links",
            value: [
              `[Add to Server](https://discord.com/api/oauth2/authorize?client_id=${this.client.user.id}&permissions=277025770560&scope=bot%20applications.commands)`,
              `[Support Server](https://discord.gg/VgjQw6jq7U)`,
              `[GitHub](https://github.com/Xargana/Aurora)`
            ].join(' • '),
            inline: false
          }
        ],
        footer: {
          text: `Requested by ${interaction.user.tag}`,
          icon_url: interaction.user.displayAvatarURL({ dynamic: true })
        },
        timestamp: new Date()
      };
      
      // Add creator info if available
      if (process.env.OWNER_ID) {
        try {
          const owner = await this.client.users.fetch(process.env.OWNER_ID);
          infoEmbed.fields.push({
            name: "Creator",
            value: `${owner.tag}`,
            inline: true
          });
        } catch (error) {
          console.error("Could not fetch owner information:", error);
        }
      }
      
      await this.sendResponse(interaction, { embeds: [infoEmbed] });
    } catch (error) {
      console.error("Error in info command:", error);
      await this.sendErrorResponse(interaction, "An error occurred while fetching bot information.");
    }
  }
}

module.exports = Info;
