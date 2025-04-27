const { ApplicationCommandOptionType } = require('discord.js');
const CommandBase = require('../../classes/CommandBase');
const MinecraftAPIUtils = require('../../classes/MinecraftAPIUtils');

class MCServer extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'mcserver';
    this.description = 'Minecraft server finder commands';
    
    // Create subcommand structure
    this.options = [
      {
        name: 'search',
        description: 'Search for Minecraft servers with specific criteria',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'version',
            description: 'Server version (e.g. 1.19.2)',
            type: ApplicationCommandOptionType.String,
            required: false
          },
          {
            name: 'playercount',
            description: 'Player count (e.g. >10, <=5, 11-20)',
            type: ApplicationCommandOptionType.String,
            required: false
          },
          {
            name: 'country',
            description: 'Country code (e.g. US, DE)',
            type: ApplicationCommandOptionType.String,
            required: false
          },
          {
            name: 'page',
            description: 'Page number',
            type: ApplicationCommandOptionType.Integer,
            required: false
          }
        ]
      },
      {
        name: 'random',
        description: 'Get a random online Minecraft server',
        type: ApplicationCommandOptionType.Subcommand
      },
      {
        name: 'ping',
        description: 'Ping a specific Minecraft server',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'ip',
            description: 'Server IP address',
            type: ApplicationCommandOptionType.String,
            required: true
          },
          {
            name: 'port',
            description: 'Server port (default: 25565)',
            type: ApplicationCommandOptionType.Integer,
            required: false
          }
        ]
      }
    ];
  }
  
  async execute(interaction) {
    await this.deferReply(interaction);
    
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'search':
        await this.handleSearch(interaction);
        break;
      case 'random':
        await this.handleRandom(interaction);
        break;
      case 'ping':
        await this.handlePing(interaction);
        break;
      default:
        await this.sendErrorResponse(interaction, "Unknown subcommand");
    }
  }
  
  async handleSearch(interaction) {
    try {
      // Get search parameters
      const version = interaction.options.getString('version');
      const playerCountStr = interaction.options.getString('playercount');
      const country = interaction.options.getString('country');
      const page = interaction.options.getInteger('page') || 1;
      
      // Build query parameters
      const params = {};
      if (version) params.version = version;
      if (country) params.country = country;
      
      // Handle player count range format
      if (playerCountStr) {
        let minPlayers, maxPlayers;
        
        if (playerCountStr.startsWith('>=')) {
          minPlayers = parseInt(playerCountStr.substring(2));
        } else if (playerCountStr.startsWith('<=')) {
          maxPlayers = parseInt(playerCountStr.substring(2));
        } else if (playerCountStr.startsWith('>')) {
          minPlayers = parseInt(playerCountStr.substring(1)) + 1;
        } else if (playerCountStr.startsWith('<')) {
          maxPlayers = parseInt(playerCountStr.substring(1)) - 1;
        } else if (playerCountStr.includes('-')) {
          const [min, max] = playerCountStr.split('-');
          minPlayers = parseInt(min);
          maxPlayers = parseInt(max);
        } else {
          // Exact match
          params.playerCount = parseInt(playerCountStr);
        }
        
        if (minPlayers) params.minPlayers = minPlayers;
        if (maxPlayers) params.maxPlayers = maxPlayers;
      }
      
      // Calculate skip value for pagination
      const skip = (page - 1) * 10;
      
      // Fetch servers and count simultaneously
      const [servers, totalCount] = await Promise.all([
        MinecraftAPIUtils.fetchServers(params, 10, skip),
        MinecraftAPIUtils.getServerCount(params)
      ]);
      
      if (servers.length === 0) {
        await this.sendResponse(interaction, {
          embeds: [{
            title: "No Servers Found",
            description: "No servers match your search criteria.",
            color: 0xff0000
          }]
        });
        return;
      }
      
      // Create an embed for the results
      const fields = servers.map((server, index) => {
        return {
          name: `${index + 1}. ${MinecraftAPIUtils.cleanIp(parseInt(server.ip))}:${server.port}`,
          value: `Version: ${server.version?.name || "Unknown"}\nPlayers: ${server.players?.online || 0}/${server.players?.max || 0}\nCountry: ${server.geo?.country || "Unknown"}`
        };
      });
      
      const totalPages = Math.ceil(totalCount / 10);
      
      await this.sendResponse(interaction, {
        embeds: [{
          title: "Minecraft Servers",
          description: `Found ${totalCount} servers matching your criteria.\nShowing page ${page}/${totalPages}`,
          fields: fields,
          color: 0x3498db,
          footer: {
            text: `Use /mcserver search with page parameter to navigate pages`
          }
        }]
      });
      
    } catch (error) {
      console.error("Error in mcserver search:", error);
      await this.sendErrorResponse(interaction, "Failed to search for servers. Please try again later.");
    }
  }
  
  async handleRandom(interaction) {
    try {
      const server = await MinecraftAPIUtils.fetchRandomServer();
      
      if (!server) {
        await this.sendErrorResponse(interaction, "Failed to find a random server. Please try again.");
        return;
      }
      
      await this.sendResponse(interaction, {
        embeds: [{
          title: `Random Minecraft Server`,
          fields: [
            { name: 'IP', value: MinecraftAPIUtils.cleanIp(parseInt(server.ip)), inline: true },
            { name: 'Port', value: String(server.port), inline: true },
            { name: 'Version', value: `${server.version.name || "Unknown"} (${server.version.protocol || "Unknown"})`, inline: true },
            { name: 'Description', value: MinecraftAPIUtils.getDescription(server.description) || "No description" },
            { name: 'Players', value: MinecraftAPIUtils.displayPlayers(server) },
            { name: 'Country', value: server.geo?.country || "Unknown", inline: true },
            { name: 'Last Seen', value: server.lastSeen ? `<t:${server.lastSeen}:R>` : "Unknown", inline: true }
          ],
          color: 0x3498db,
          footer: {
            text: `Discovered: ${server.discovered ? new Date(server.discovered * 1000).toLocaleDateString() : "Unknown"}`
          }
        }]
      });
      
    } catch (error) {
      console.error("Error in mcserver random:", error);
      await this.sendErrorResponse(interaction, "Failed to get a random server. Please try again later.");
    }
  }
  
  async handlePing(interaction) {
    try {
      const ip = interaction.options.getString('ip');
      const port = interaction.options.getInteger('port') || 25565;
      
      const server = await MinecraftAPIUtils.getServerInfo(ip, port);
      
      if (!server) {
        await this.sendErrorResponse(interaction, `Server ${ip}:${port} not found in database.`);
        return;
      }
      
      await this.sendResponse(interaction, {
        embeds: [{
          title: `Server Info: ${ip}:${port}`,
          fields: [
            { name: 'Version', value: `${server.version?.name || "Unknown"} (${server.version?.protocol || "Unknown"})`, inline: true },
            { name: 'Description', value: MinecraftAPIUtils.getDescription(server.description) || "No description" },
            { name: 'Players', value: MinecraftAPIUtils.displayPlayers(server) },
            { name: 'Country', value: server.geo?.country || "Unknown", inline: true },
            { name: 'Last Seen', value: server.lastSeen ? `<t:${server.lastSeen}:R>` : "Unknown", inline: true }
          ],
          color: 0x3498db,
          footer: {
            text: `Use "/mcserver ping ${ip} ${port}" to refresh this data`
          }
        }]
      });
      
    } catch (error) {
      console.error(`Error in mcserver ping:`, error);
      await this.sendErrorResponse(interaction, "Failed to ping server. The server might be offline or not in the database.");
    }
  }
}

module.exports = MCServer;
