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
    
    // Setup periodic cleanup
    this.setupPeriodicCleanup();
    
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
  
  setupPeriodicCleanup() {
    // Run cleanup every 10 minutes
    setInterval(() => {
      this.cleanupOldTempDirs();
    }, 10 * 60 * 1000);
  }
  
  cleanupOldTempDirs() {
    const baseDir = path.join(__dirname, '../../');
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes old
    
    try {
      const files = fs.readdirSync(baseDir);
      
      for (const file of files) {
        if (file.startsWith('temp_gif_')) {
          const filePath = path.join(baseDir, file);
          const stat = fs.statSync(filePath);
          
          // If directory is older than 15 minutes, delete it
          if (now - stat.mtimeMs > maxAge) {
            this.deleteRecursive(filePath);
            console.log(`[Cleanup] Removed old temp directory: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error(`[Cleanup] Error during periodic cleanup: ${error.message}`);
    }
  }
  
  deleteRecursive(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
          const filePath = path.join(dirPath, file);
          if (fs.lstatSync(filePath).isDirectory()) {
            this.deleteRecursive(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        });
        fs.rmdirSync(dirPath);
      }
    } catch (error) {
      console.error(`[Cleanup] Error deleting directory: ${error.message}`);
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
  
  isDev() {
    return process.env.ENVIRONMENT === 'dev' || process.env.DEV === 'true';
  }

  async sendStartupNotification() {
    // Skip notifications in dev environment
    if (this.isDev()) {
      console.log('Dev environment detected, skipping startup notification');
      return;
    }

    // Create startup embed
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
    
    // Notify owner via DM if OWNER_ID is set
    if (process.env.OWNER_ID) {
      try {
        const ownerId = process.env.OWNER_ID;
        const owner = await this.client.users.fetch(ownerId);
        await owner.send({ embeds: [startupEmbed] });
        console.log(`Sent startup notification to owner: ${owner.tag}`);
      } catch (error) {
        console.error("Failed to send startup notification to owner:", error);
      }
    }
    
    // Notify in a specific channel if STARTUP_CHANNEL_ID is set
    if (process.env.STARTUP_CHANNEL_ID) {
      try {
        const channelId = process.env.STARTUP_CHANNEL_ID;
        console.log(`Attempting to send notification to channel ID: ${channelId}`);
        
        // More detailed error handling for channel fetch
        let channel;
        try {
          channel = await this.client.channels.fetch(channelId);
          console.log(`Successfully fetched channel: ${channel?.name || 'Unknown'} (${channel?.id || 'No ID'})`);
        } catch (fetchError) {
          console.error(`Error fetching channel: ${fetchError.message}`);
          return;
        }
        
        if (!channel) {
          console.error(`Could not find channel with ID: ${channelId}`);
          return;
        }
        
        // Check permissions
        if (channel.isTextBased && channel.permissionsFor && 
            channel.permissionsFor(this.client.user)?.has('SendMessages') === false) {
          console.error(`Bot does not have permission to send messages in channel: ${channel.name} (${channel.id})`);
          return;
        }
        
        // Send the message
        await channel.send({ embeds: [startupEmbed] });
        console.log(`Sent startup notification to channel: ${channel.name} (${channel.id})`);
      } catch (error) {
        console.error(`Failed to send startup notification to channel (${process.env.STARTUP_CHANNEL_ID}):`, error);
        console.error(`Error stack: ${error.stack}`);
      }
    } else {
      console.log("STARTUP_CHANNEL_ID not set, skipping channel notification");
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

  async sendShutdownNotification(reason, error = null) {
    // Skip notifications in dev environment
    if (this.isDev()) {
      console.log('Dev environment detected, skipping shutdown notification');
      return;
    }

    // Create shutdown embed
    const shutdownEmbed = {
    title: "Bot Shutdown Notification",
    description: `Bot is shutting down at <t:${Math.floor(Date.now() / 1000)}:F>`,
    color: 0xFF0000, // Red color for shutdown
    fields: [
      {
        name: "Bot Name",
        value: this.client?.user?.tag || "Unknown (Client unavailable)",
        inline: true
      },
      {
        name: "Shutdown Reason",
        value: reason || "Unknown reason",
        inline: true
      },
      {
        name: "Relative Time",
        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
        inline: true
      }
    ],
    footer: {
      text: "Aurora - Shutdown Event"
    },
    timestamp: new Date()
  };
  
  // Add error details if available
  if (error) {
    shutdownEmbed.fields.push({
      name: "Error Details",
      value: `\`\`\`\n${error.message || String(error).substring(0, 1000)}\n\`\`\``,
      inline: false
    });
  }
  
  // Only attempt notifications if client is ready
  if (this.client?.isReady()) {
    // Notify owner via DM if OWNER_ID is set
    if (process.env.OWNER_ID) {
      try {
        const ownerId = process.env.OWNER_ID;
        const owner = await this.client.users.fetch(ownerId);
        await owner.send({ embeds: [shutdownEmbed] });
        console.log(`Sent shutdown notification to owner: ${owner.tag}`);
      } catch (notifyError) {
        console.error("Failed to send shutdown notification to owner:", notifyError);
      }
    }
    
    // Notify in a specific channel if STARTUP_CHANNEL_ID is set
    if (process.env.STARTUP_CHANNEL_ID) {
      try {
        const channelId = process.env.STARTUP_CHANNEL_ID;
        const channel = await this.client.channels.fetch(channelId);
        
        if (channel && channel.isTextBased()) {
          await channel.send({ embeds: [shutdownEmbed] });
          console.log(`Sent shutdown notification to channel: ${channel.name} (${channel.id})`);
        } else {
          console.error(`Could not find channel with ID: ${channelId} or it's not a text channel`);
        }
      } catch (notifyError) {
        console.error(`Failed to send shutdown notification to channel (${process.env.STARTUP_CHANNEL_ID}):`, notifyError);
      }
    }
  } else {
    console.log("Client not ready, cannot send shutdown notifications");
  }
}

  
  async start() {
    // Login to Discord
    if (process.env.ENVIRONMENT === "dev" || process.env.DEV === 'true') {
      await this.client.login(process.env.DEV_TOKEN);
    } else {
      await this.client.login(process.env.DISCORD_TOKEN);
    }
    
    return this;
  }
}

module.exports = Bot;
