const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class MCServer extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'mcserver';
    this.description = 'Minecraft server finder commands';
    this.cooldown = 5; // 5 second cooldown
    
    // API base URL
    this.apiBaseUrl = "https://api.cornbread2100.com";
  }
  
  async execute(interaction) {
    try {
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
        case 'bedrock':
          await this.handleBedrockPing(interaction);
          break;
        default:
          await this.sendErrorResponse(interaction, "Unknown subcommand");
      }
    } catch (error) {
      console.error(`Error in mcserver command:`, error);
      await this.sendErrorResponse(interaction, "An error occurred while processing your request.");
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
      const params = new URLSearchParams();
      if (version) params.append('version', version);
      if (country) params.append('country', country);
      
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
          params.append('playerCount', parseInt(playerCountStr));
        }
        
        if (minPlayers) params.append('minPlayers', minPlayers);
        if (maxPlayers) params.append('maxPlayers', maxPlayers);
      }
      
      // Add limit and skip for pagination
      params.append('limit', 10);
      params.append('skip', (page - 1) * 10);
      
      // Fetch servers
      const serversResponse = await axios.get(`${this.apiBaseUrl}/servers?${params.toString()}`);
      const servers = serversResponse.data;
      
      // Fetch total count
      const countResponse = await axios.get(`${this.apiBaseUrl}/count?${params.toString()}`);
      const totalCount = countResponse.data;
      
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
      const embed = new EmbedBuilder()
        .setTitle("Minecraft Servers")
        .setDescription(`Found ${totalCount} servers matching your criteria.\nShowing page ${page}/${Math.ceil(totalCount / 10)}`)
        .setColor(0x3498db);
      
      // Add fields for each server
      servers.forEach((server, index) => {
        let ip = this.cleanIp(parseInt(server.ip));
        embed.addFields({
          name: `${index + 1}. ${ip}:${server.port}`,
          value: `Version: ${server.version?.name || "Unknown"}\nPlayers: ${server.players?.online || 0}/${server.players?.max || 0}\nCountry: ${server.geo?.country || "Unknown"}`
        });
      });
      
      // Add pagination buttons if needed
      const components = [];
      if (totalCount > 10) {
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`mcserver_prev_${page}`)
              .setLabel('Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page <= 1),
            new ButtonBuilder()
              .setCustomId(`mcserver_next_${page}`)
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page >= Math.ceil(totalCount / 10))
          );
        components.push(row);
      }
      
      await this.sendResponse(interaction, {
        embeds: [embed],
        components: components
      });
      
    } catch (error) {
      console.error("Error in mcserver search:", error);
      await this.sendErrorResponse(interaction, "Failed to search for servers. Please try again later.");
    }
  }
  
  async handleRandom(interaction) {
    try {
      // Fetch a random server
      const params = new URLSearchParams();
      params.append('limit', 1);
      params.append('random', true);
      
      const response = await axios.get(`${this.apiBaseUrl}/servers?${params.toString()}`);
      const server = response.data[0];
      
      if (!server) {
        await this.sendErrorResponse(interaction, "Failed to find a random server. Please try again.");
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`Random Minecraft Server`)
        .setColor(0x3498db)
        .addFields(
          { name: 'IP', value: this.cleanIp(parseInt(server.ip)), inline: true },
          { name: 'Port', value: String(server.port), inline: true },
          { name: 'Version', value: `${server.version?.name || "Unknown"} (${server.version?.protocol || "Unknown"})`, inline: true },
          { name: 'Description', value: this.getDescription(server.description) || "No description" },
          { name: 'Players', value: this.displayPlayers(server) },
          { name: 'Country', value: server.geo?.country || "Unknown", inline: true },
          { name: 'Last Seen', value: server.lastSeen ? `<t:${server.lastSeen}:R>` : "Unknown", inline: true }
        )
        .setFooter({ text: `Discovered: ${server.discovered ? new Date(server.discovered * 1000).toLocaleDateString() : "Unknown"}` });
      
      await this.sendResponse(interaction, {
        embeds: [embed]
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
      
      const response = await axios.get(`${this.apiBaseUrl}/servers?ip=${ip}&port=${port}`);
      const server = response.data[0];
      
      if (!server) {
        await this.sendErrorResponse(interaction, `Server ${ip}:${port} not found in database.`);
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`Server Info: ${ip}:${port}`)
        .setColor(0x3498db)
        .addFields(
          { name: 'Version', value: `${server.version?.name || "Unknown"} (${server.version?.protocol || "Unknown"})`, inline: true },
          { name: 'Description', value: this.getDescription(server.description) || "No description" },
          { name: 'Players', value: this.displayPlayers(server) },
          { name: 'Country', value: server.geo?.country || "Unknown", inline: true },
          { name: 'Last Seen', value: server.lastSeen ? `<t:${server.lastSeen}:R>` : "Unknown", inline: true }
        )
        .setFooter({ text: `Use "/mcserver ping ${ip} ${port}" to refresh this data` });
      
      await this.sendResponse(interaction, {
        embeds: [embed]
      });
      
    } catch (error) {
      console.error(`Error in mcserver ping:`, error);
      await this.sendErrorResponse(interaction, "Failed to ping server. The server might be offline or not in the database.");
    }
  }
  
  async handleBedrockPing(interaction) {
    try {
      const ip = interaction.options.getString('ip');
      const port = interaction.options.getInteger('port') || 19132;
      
      const response = await axios.get(`${this.apiBaseUrl}/servers?ip=${ip}&port=${port}&bedrock=true`);
      const server = response.data[0];
      
      if (!server) {
        await this.sendErrorResponse(interaction, `Bedrock server ${ip}:${port} not found in database.`);
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`Bedrock Server Info: ${ip}:${port}`)
        .setColor(0x3498db)
        .addFields(
          { name: 'Version', value: `${server.version?.name || "Unknown"}`, inline: true },
          { name: 'Description', value: this.getDescription(server.description) || "No description" },
          { name: 'Players', value: this.displayPlayers(server) },
          { name: 'Country', value: server.geo?.country || "Unknown", inline: true },
          { name: 'Last Seen', value: server.lastSeen ? `<t:${server.lastSeen}:R>` : "Unknown", inline: true }
        )
        .setFooter({ text: `Use "/mcserver bedrock ${ip} ${port}" to refresh this data` });
      
      await this.sendResponse(interaction, {
        embeds: [embed]
      });
      
    } catch (error) {
      console.error(`Error in mcserver bedrock ping:`, error);
      await this.sendErrorResponse(interaction, "Failed to ping Bedrock server. The server might be offline or not in the database.");
    }
  }
  
  // Utility Functions
  
  /**
   * Cleans up an IP address from integer format
   */
  cleanIp(ip) {
    return [
      (ip >>> 24) & 255,
      (ip >>> 16) & 255,
      (ip >>> 8) & 255,
      ip & 255
    ].join('.');
  }
  
  /**
   * Formats the description for display
   */
  getDescription(description) {
    if (!description) return "No description";
    
    try {
      if (typeof description === 'object') {
        // Handle JSON description
        const text = description.text || "";
        const extra = description.extra || [];
        return text + extra.map(e => e.text || "").join("");
      }
      
      if (typeof description === 'string' && description.startsWith('{')) {
        // Try to parse potential JSON string
        try {
          const parsed = JSON.parse(description);
          return this.getDescription(parsed);
        } catch (e) {
          // Not valid JSON, return as is
          return description;
        }
      }
      
      return description.toString();
    } catch (error) {
      console.error("Error parsing description:", error);
      return "Error displaying description";
    }
  }
  
  /**
   * Format player information for display
   */
  displayPlayers(server) {
    if (!server.players) return "Players: Unknown";
    
    const { online, max } = server.players;
    let result = `${online || 0}/${max || 0}`;
    
    if (server.players.sample && server.players.sample.length > 0) {
      result += "\n**Online Players:**\n";
      result += server.players.sample.map(p => p.name).join(", ");
    }
    
    return result;
  }
}

module.exports = MCServer;
