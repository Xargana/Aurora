const CommandBase = require('../../classes/CommandBase');
const { version } = require('../../package.json');
const os = require('os');

class Info extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'info';
    this.description = 'Display information about the bot';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      
      // Calculate uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      // Format uptime string
      const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      
      // Get server count
      const serverCount = this.client.guilds.cache.size;
      const userCount = this.client.users.cache.size;
      
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
              `**Users:** ${userCount}`,
              `**Commands:** ${this.client.application.commands.cache.size || "Loading..."}`,
              `**Uptime:** ${uptimeString}`
            ].join('\n'),
            inline: true
          },
          {
            name: "System Info",
            value: [
              `**Platform:** ${os.platform()} ${os.release()}`,
              `**Memory:** ${memoryUsedMB}MB / ${memoryTotalMB}MB`,
              `**Node.js:** ${process.version}`,
              `**Bot Version:** ${version || "1.0.0"}`
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
