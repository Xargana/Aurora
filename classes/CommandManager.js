const { REST, Routes } = require("discord.js");
const fs = require('fs');
const path = require('path');

class CommandManager {
  constructor(client) {
    this.client = client;
    this.commands = new Map();
    this.globalCommands = [];
    this.guildCommands = [];
    this.userCommands = [];
    
    // Load all commands
    this.loadCommands();
  }
  
  loadCommands() {
    // Load command definitions
    try {
      const commandDefinitions = require('../config/commandDefinitions');
      this.globalCommands = commandDefinitions.globalCommands;
      this.guildCommands = commandDefinitions.guildCommands;
      this.userCommands = commandDefinitions.userCommands;
    } catch (error) {
      console.error("Failed to load command definitions:", error);
      this.globalCommands = [];
      this.guildCommands = [];
      this.userCommands = [];
    }
    
    // Load command implementations
    const commandsDir = path.join(__dirname, '../commands');
    this.loadCommandsFromDirectory(commandsDir);
  }
  
  loadCommandsFromDirectory(directory) {
    try {
      const categories = fs.readdirSync(directory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
        
      for (const category of categories) {
        const categoryPath = path.join(directory, category);
        const commandFiles = fs.readdirSync(categoryPath)
          .filter(file => file.endsWith('.js'));
          
        for (const file of commandFiles) {
          try {
            const CommandClass = require(path.join(categoryPath, file));
            const command = new CommandClass(this.client);
            this.commands.set(command.name, command);
            console.log(`Loaded command: ${command.name} from ${category}/${file}`);
          } catch (error) {
            console.error(`Failed to load command from ${file}:`, error);
          }
        }
      }
      console.log(`Loaded ${this.commands.size} commands in total`);
    } catch (error) {
      console.error("Failed to load commands from directory:", error);
    }
  }
  
  async getExistingCommands(rest, route) {
    try {
      return await rest.get(route);
    } catch (error) {
      console.error(`Error fetching commands from ${route}:`, error);
      return [];
    }
  }
  
  async registerCommands() {
    if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
      console.error("Missing required environment variables: DISCORD_TOKEN or CLIENT_ID");
      return;
    }

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    try {
      console.log("Starting command registration...");

      // First, get all existing global commands to check for entry point commands
      const existingGlobalCommands = await this.getExistingCommands(
        rest, 
        Routes.applicationCommands(process.env.CLIENT_ID)
      );
      
      // Find any entry point or special commands we need to preserve
      const entryPointCommands = existingGlobalCommands.filter(
        cmd => cmd.integration_types && cmd.integration_types.includes(1)
      );
      
      // Create a map to track command names we've already added
      const commandNameMap = new Map();
      
      // Create a filtered array of commands without duplicates
      const allGlobalCommands = [];
      
      // First add global commands
      for (const cmd of this.globalCommands) {
        if (!commandNameMap.has(cmd.name)) {
          commandNameMap.set(cmd.name, true);
          allGlobalCommands.push(cmd);
        } else {
          console.warn(`Skipping duplicate global command: ${cmd.name}`);
        }
      }
      
      // Then add user commands
      for (const cmd of this.userCommands) {
        if (!commandNameMap.has(cmd.name)) {
          commandNameMap.set(cmd.name, true);
          allGlobalCommands.push(cmd);
        } else {
          console.warn(`Skipping duplicate user command: ${cmd.name}`);
        }
      }
      
      // Finally, add entry point commands that don't duplicate existing names
      for (const cmd of entryPointCommands) {
        if (!commandNameMap.has(cmd.name)) {
          commandNameMap.set(cmd.name, true);
          allGlobalCommands.push(cmd);
        } else {
          console.log(`Entry point command "${cmd.name}" already exists, keeping existing definition`);
        }
      }
      
      console.log(`Registering ${allGlobalCommands.length} unique global commands...`);
      
      // Update global commands (including DM-compatible commands)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID), 
        { body: allGlobalCommands }
      );
      console.log(`Successfully registered ${allGlobalCommands.length} global commands`);
      
      // If we have guild-specific commands, register them for each guild
      if (this.guildCommands.length > 0) {
        // Wait for client to be ready to access guilds
        if (!this.client.isReady()) {
          await new Promise(resolve => {
            this.client.once('ready', resolve);
          });
        }
        
        // Register guild commands for each guild the bot is in
        for (const guild of this.client.guilds.cache.values()) {
          await this.registerGuildCommands(guild);
        }
      }

      console.log("All commands registered successfully!");
    } catch (error) {
      console.error("Error updating commands:", error);
      if (error.code === 50240) {
        console.error("This error suggests you need to include all Entry Point commands in your update.");
      }
    }
  }
  
  async registerGuildCommands(guild) {
    if (this.guildCommands.length === 0) return;
    
    try {
      console.log(`Registering guild commands for ${guild.name} (${guild.id})...`);
      const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
      
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
        { body: this.guildCommands }
      );
      console.log(`Successfully registered ${this.guildCommands.length} guild commands for ${guild.name}`);
    } catch (error) {
      console.error(`Error registering guild commands for ${guild.name}:`, error);
    }
  }
  
  async handleInteraction(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = this.commands.get(interaction.commandName);
        if (command) {
          await command.execute(interaction);
        } else {
          await interaction.reply({ 
            content: `Command '${interaction.commandName}' not implemented yet.`, 
            ephemeral: true 
          });
        }
      } else if (interaction.isUserContextMenuCommand()) {
        if (interaction.commandName === "User Info") {
          const user = interaction.targetUser;
          
          const userInfoEmbed = {
            title: "User Information",
            color: 0x9B59B6,
            thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
            fields: [
              { name: "Username", value: user.username, inline: true },
              { name: "User ID", value: user.id, inline: true },
              { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            ],
            footer: { text: "User Information" },
            timestamp: new Date()
          };
          
          await interaction.reply({ embeds: [userInfoEmbed], ephemeral: true });
        }
      }
    } catch (error) {
      console.error(`Error executing command ${interaction.commandName}:`, error);
      
      // Try to respond if we haven't already
      try {
        const replyMethod = interaction.deferred ? interaction.editReply : interaction.reply;
        await replyMethod.call(interaction, {
          content: "An error occurred while executing this command.",
          ephemeral: true
        });
      } catch (e) {
        console.error("Could not send error response:", e);
      }
    }
  }
}

module.exports = CommandManager;
