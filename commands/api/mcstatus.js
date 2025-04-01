const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class McStatus extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'mcstatus';
    this.description = 'Check the status of a Minecraft server';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const serverAddress = interaction.options.getString("server");
      const isBedrock = interaction.options.getBoolean("bedrock") ?? false;
      
      const apiUrl = isBedrock 
        ? `https://api.mcsrvstat.us/bedrock/2/${encodeURIComponent(serverAddress)}`
        : `https://api.mcsrvstat.us/2/${encodeURIComponent(serverAddress)}`;
      
      const response = await axios.get(apiUrl);
      const data = response.data;
      
      if (!data.online) {
        await this.sendResponse(interaction, {
          content: `📡 **${serverAddress}** is currently offline or could not be reached.`
        });
        return;
      }
      
      const serverEmbed = {
        title: `Minecraft Server Status: ${serverAddress}`,
        color: 0x44FF44,
        thumbnail: { 
          url: 'https://www.minecraft.net/content/dam/games/minecraft/key-art/MC_The-Wild-Update_540x300.jpg'
        },
        fields: [
          { name: 'Status', value: data.online ? '✅ Online' : '❌ Offline', inline: true },
          { name: 'Players', value: data.players ? `${data.players.online}/${data.players.max}` : 'Unknown', inline: true },
          { name: 'Version', value: data.version || 'Unknown', inline: true }
        ],
        footer: { text: 'Powered by mcsrvstat.us' },
        timestamp: new Date()
      };
      
      if (data.motd && data.motd.clean && data.motd.clean.length > 0) {
        serverEmbed.description = `**MOTD:**\n${data.motd.clean.join('\n')}`;
      }
      
      if (data.players && data.players.list && data.players.list.length > 0) {
        const playerList = data.players.list.slice(0, 20).join(', ');
        const hasMore = data.players.list.length > 20;
        
        serverEmbed.fields.push({
          name: 'Online Players',
          value: playerList + (hasMore ? '...' : '')
        });
      }
      
      await this.sendResponse(interaction, { embeds: [serverEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to fetch Minecraft server status. Please check the server address and try again.");
    }
  }
}

module.exports = McStatus;
