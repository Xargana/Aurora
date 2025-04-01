const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const CommandManager = require('./CommandManager');
const fs = require('fs');
const path = require('path');

class Bot {
  constructor() {
    // Initialize client with intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping
      ],
      partials: ['CHANNEL', 'MESSAGE']
    });
    
    // Initialize command manager
    this.commandManager = new CommandManager(this.client);
    
    // Setup temp directory
    this.setupTempDirectory();
    
    // Setup event handlers
    this.setupEventHandlers();
  }
  
  setupTempDirectory() {
    const tempDir = path.join(__dirname, '../../temp');
    if (fs.existsSync(tempDir)) {
      console.log("Cleaning up temp directory...");
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
    } else {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  }
  
  setupEventHandlers() {
    // Ready event
    this.client.once("ready", async () => {
      console.log(`Logged in as ${this.client.user.tag}`);
      
      // Register commands
      await this.commandManager.registerCommands();
      
      // Send startup notification
      await this.sendStartupNotification();
    });
    
    // Interaction event
    this.client.on("interactionCreate", async (interaction) => {
      console.log(`Received interaction: ${interaction.commandName} | Channel type: ${interaction.channel?.type} | DM: ${interaction.channel?.type === ChannelType.DM}`);
      
      // Handle the interaction
      await this.commandManager.handleInteraction(interaction);
    });
    
    // Guild join event
    this.client.on("guildCreate", async (guild) => {
      console.log(`Joined new guild: ${guild.name} (${guild.id})`);
      
      // Register guild-specific commands
      await this.commandManager.registerGuildCommands(guild);
      
      // Notify owner
      await this.notifyOwnerOfGuildJoin(guild);
    });
    
    // Error handling
    process.on('unhandledRejection', error => {
      console.error('Unhandled promise rejection:', error);
    });
  }
  
  async sendStartupNotification() {
    if (process.env.OWNER_ID) {
      try {
        const ownerId = process.env.OWNER_ID;
        const owner = await this.client.users.fetch(ownerId);
        const startupEmbed = {
          title: "Bot Status Update",
          description: `Bot started successfully at <t:${Math.floor(Date.now() / 1000)}:F>`,
          color: 0x00ff00,
          fields: [
            {
              name: "Bot Name",
              value: this.client.user.tag,
              inline: true
            },
            {
              name: "Relative Time",
              value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
              inline: true
            }
          ],
          footer: {
            text: "Aurora"
          }
        };
        
        await owner.send({ embeds: [startupEmbed] });
      } catch (error) {
        console.error("Failed to send startup notification:", error);
      }
    }
  }
  
  async notifyOwnerOfGuildJoin(guild) {
    if (process.env.OWNER_ID) {
      try {
        const owner = await this.client.users.fetch(process.env.OWNER_ID);
        const guildJoinEmbed = {
          title: "New Guild Joined",
          color: 0x00ff00,
          fields: [
            { name: "Guild Name", value: guild.name, inline: true },
            { name: "Guild ID", value: guild.id, inline: true },
            { name: "Member Count", value: guild.memberCount.toString(), inline: true }
          ],
          timestamp: new Date(),
          footer: { text: "Guild Join Event" }
        };
        
        await owner.send({ embeds: [guildJoinEmbed] });
      } catch (error) {
        console.error("Failed to notify owner of guild join:", error);
      }
    }
  }
  
  async start() {
    // Login to Discord
    await this.client.login(process.env.DISCORD_TOKEN);
    return this;
  }
}

module.exports = Bot;
