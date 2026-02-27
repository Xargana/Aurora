const { REST, Routes } = require("discord.js");
const fs = require('fs');
const path = require('path');
const rateLimiter = require('./rateLimiter');

class CommandManager {
  constructor(client) {
    this.client = client;
    this.commands = new Map();
    this.globalCommands = [];
    this.guildCommands = [];
    this.userCommands = [];
    this.messageCommands = [];
    
    // Load all commands
    this.loadCommands();
  }
  
  /**
   * Check if running in development mode
   * @returns {boolean} - True if DEV environment is set
   */
  isDev() {
    return process.env.ENVIRONMENT === 'dev' || process.env.DEV === 'true';
  }
  
  loadCommands() {
    // Load command definitions
    try {
      const commandDefinitions = require('../config/commandDefinitions');
      this.globalCommands = commandDefinitions.globalCommands;
      this.guildCommands = commandDefinitions.guildCommands;
      this.userCommands = commandDefinitions.userCommands;
      this.messageCommands = commandDefinitions.messageCommands || [];
    } catch (error) {
      console.error("Failed to load command definitions:", error);
      this.globalCommands = [];
      this.guildCommands = [];
      this.userCommands = [];
      this.messageCommands = [];
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

    // Determine which token/client ID to use
    const useDevConfig = this.isDev() && process.env.DEV_TOKEN && process.env.DEV_CLIENT_ID;
    const token = useDevConfig ? process.env.DEV_TOKEN : process.env.DISCORD_TOKEN;
    const clientId = useDevConfig ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID;
    const rest = new REST({ version: "10" }).setToken(token);

    try {
      console.log(`Starting command registration in ${useDevConfig ? 'DEV' : 'PROD'} mode...`);

      // First, get all existing global commands to check for entry point commands
      const existingGlobalCommands = await this.getExistingCommands(
        rest, 
        Routes.applicationCommands(clientId)
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
      
      // Then add message commands
      for (const cmd of this.messageCommands) {
        if (!commandNameMap.has(cmd.name)) {
          commandNameMap.set(cmd.name, true);
          allGlobalCommands.push(cmd);
        } else {
          console.warn(`Skipping duplicate message command: ${cmd.name}`);
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
        Routes.applicationCommands(clientId), 
        { body: allGlobalCommands }
      );
      console.log(`Successfully registered ${allGlobalCommands.length} global commands to ${useDevConfig ? 'DEV' : 'PROD'} application`);
      
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
      
      // Use dev credentials if both DEV_TOKEN and DEV_CLIENT_ID are set
      const useDevConfig = this.isDev() && process.env.DEV_TOKEN && process.env.DEV_CLIENT_ID;
      const token = useDevConfig ? process.env.DEV_TOKEN : process.env.DISCORD_TOKEN;
      const clientId = useDevConfig ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID;
      const rest = new REST({ version: "10" }).setToken(token);
      
      await rest.put(
        Routes.applicationGuildCommands(clientId, guild.id),
        { body: this.guildCommands }
      );
      console.log(`Successfully registered ${this.guildCommands.length} guild commands for ${guild.name}`);
    } catch (error) {
      console.error(`Error registering guild commands for ${guild.name}:`, error);
    }
  }
  
  isBlacklisted(userId) {
    const fs = require('fs');
    const path = require('path');
    const blacklistPath = path.join(__dirname, '../gulag.txt');
    
    if (!fs.existsSync(blacklistPath)) {
      return false;
    }
    
    const blacklistedIds = fs.readFileSync(blacklistPath, 'utf-8')
      .trim()
      .split('\n')
      .filter(id => id);
    
    return blacklistedIds.includes(userId);
  }

  async handleInteraction(interaction) {
    try {
      // Check if user is blacklisted (unless command is whitelisted)
      if (interaction.isChatInputCommand()) {
        const commandName = interaction.commandName;
        const whitelistedCommands = ['blacklist']; // Commands blacklisted users can still use
        
        if (this.isBlacklisted(interaction.user.id) && !whitelistedCommands.includes(commandName)) {
          return await interaction.reply({
            content: "❌ You are blacklisted and cannot use this command.",
            ephemeral: true
          });
        }
      }

      if (interaction.isModalSubmit()) {
        // Handle modal submissions
        if (interaction.customId === 'rename_file_modal') {
          const newFileName = interaction.fields.getTextInputValue('file_name_input');
          
          if (!newFileName) {
            return await interaction.reply({
              content: "❌ Please provide a file name.",
              ephemeral: true
            });
          }
          
          // Defer the reply
          await interaction.deferReply();
          
          try {
            const axios = require('axios');
            const { AttachmentBuilder } = require('discord.js');
            
            // Initialize pendingRenames map if needed
            if (!this.pendingRenames) {
              this.pendingRenames = new Map();
            }
            
            // Check if we have pending rename data for this user
            const userId = interaction.user.id;
            const renameData = this.pendingRenames.get(userId);
            
            if (!renameData) {
              return await interaction.editReply({
                content: "❌ Rename session expired. Please try again."
              });
            }
            
            // Remove the stored data
            this.pendingRenames.delete(userId);
            
            const renamedAttachments = [];
            
            for (const attachment of renameData.attachments) {
              try {
                // Download the file
                const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                const originalName = attachment.name || attachment.filename;
                const ext = originalName.includes('.') 
                  ? originalName.substring(originalName.lastIndexOf('.'))
                  : '';
                
                const finalName = newFileName + ext;
                
                // Create a new attachment with the renamed file
                const newAttachment = new AttachmentBuilder(response.data, { name: finalName });
                renamedAttachments.push(newAttachment);
              } catch (err) {
                console.error(`Error processing attachment: ${err.message}`);
              }
            }
            
            if (renamedAttachments.length === 0) {
              return await interaction.editReply({
                content: "❌ Failed to process attachments."
              });
            }
            
            await interaction.editReply({
              content: `✅ Renamed ${renamedAttachments.length} file(s) to **${newFileName}***`,
              files: renamedAttachments
            });
          } catch (error) {
            console.error(`Error in rename modal submission: ${error.message}`);
            await interaction.editReply({
              content: `❌ Failed to rename file: ${error.message}`
            });
          }
        }
        return;
      }
      
      if (interaction.isChatInputCommand()) {
        const command = this.commands.get(interaction.commandName);
        if (command) {
          // Check rate limit before executing
          const userId = interaction.user.id;
          const { isLimited, remainingTime } = rateLimiter.isRateLimited(
            userId,
            command.name,
            command.cooldown || 2
          );
          
          if (isLimited) {
            return await interaction.reply({
              content: `❌ Please wait ${remainingTime} more seconds before using this command again.`,
              ephemeral: true
            });
          }
          
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
      } else if (interaction.isMessageContextMenuCommand()) {
        if (interaction.commandName === "Convert to GIF") {
          const message = interaction.targetMessage;
          
          // Check if message has attachments
          if (message.attachments.size === 0) {
            return await interaction.reply({
              content: "This message has no attachments to convert.",
              ephemeral: true
            });
          }
          
          // Get the gif command
          const gifCommand = this.commands.get('gif');
          if (!gifCommand) {
            return await interaction.reply({
              content: "GIF command not found.",
              ephemeral: true
            });
          }
          
          // Defer the actual interaction
          await interaction.deferReply();
          
          // Mark this as a batch conversion so gif command defers cleanup
          interaction._isBatchConversion = true;
          
          // Convert all attachments
          const attachments = Array.from(message.attachments.values());
          const results = [];
          const files = [];
          
          for (const attachment of attachments) {
            try {
              // Create interaction options wrapper for each attachment
              const mockInteraction = {
                options: {
                  getAttachment: (name) => name === 'file' ? attachment : null,
                  getString: () => null,
                  getBoolean: () => false
                },
                deferred: true,
                replied: false,
                deferReply: (opts) => Promise.resolve(),
                editReply: async (opts) => {
                  // Collect files from the response - read into buffers for batch mode
                  if (opts.files) {
                    for (const file of opts.files) {
                      try {
                        // Read file into buffer if it's an AttachmentBuilder with a file path
                        if (file.attachment && typeof file.attachment === 'string') {
                          const fileBuffer = await require('fs').promises.readFile(file.attachment);
                          const newAttachment = new (require('discord.js').AttachmentBuilder)(fileBuffer, { name: file.name });
                          files.push(newAttachment);
                        } else {
                          files.push(file);
                        }
                      } catch (err) {
                        console.error(`Error reading file for batch: ${err.message}`);
                        files.push(file);
                      }
                    }
                  }
                  results.push({ 
                    name: attachment.name || attachment.filename, 
                    success: true,
                    message: opts.content 
                  });
                  return Promise.resolve();
                },
                reply: (opts) => Promise.resolve(),
                user: interaction.user,
                channel: interaction.channel
              };
              
              // Override sendErrorResponse to collect errors
              mockInteraction.sendErrorResponse = async (itr, errorMessage) => {
                results.push({ 
                  name: attachment.name || attachment.filename, 
                  success: false, 
                  error: errorMessage 
                });
              };
              
              await gifCommand.execute(mockInteraction);
            } catch (error) {
              console.error(`Error converting ${attachment.name || attachment.filename}:`, error);
              results.push({ name: attachment.name || attachment.filename, success: false, error: error.message });
            }
          }
          
          // Build final summary message
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          let summaryContent = `Converted ${successful}/${attachments.length} files\n`;
          
          // Add details for each successful conversion
          results.filter(r => r.success).forEach(r => {
            summaryContent += `\n**${r.name}**\n${r.message}`;
          });
          
          if (failed > 0) {
            summaryContent += `\n\nFailed (${failed}):`;
            results.filter(r => !r.success).forEach(r => {
              summaryContent += `\n  • ${r.name}: ${r.error}`;
            });
          }
          
          // Send summary with all files at once
          await interaction.editReply({
            content: summaryContent,
            files: files
          });
          
          // Clean up deferred temp directories after sending
          if (global.deferredTempDirs && global.deferredTempDirs.length > 0) {
            const fs = require('fs');
            const path = require('path');
            
            const cleanupTempDir = (dirPath) => {
              try {
                if (fs.existsSync(dirPath)) {
                  fs.readdirSync(dirPath).forEach((file) => {
                    const filePath = path.join(dirPath, file);
                    if (fs.lstatSync(filePath).isDirectory()) {
                      cleanupTempDir(filePath);
                    } else {
                      fs.unlinkSync(filePath);
                    }
                  });
                  fs.rmdirSync(dirPath);
                }
              } catch (error) {
                console.error(`Error cleaning up temp directory: ${error.message}`);
              }
            };
            
            global.deferredTempDirs.forEach(dir => cleanupTempDir(dir));
            global.deferredTempDirs = [];
          }
        } else if (interaction.commandName === "Rename File") {
          const message = interaction.targetMessage;
          
          // Check if message has attachments
          if (message.attachments.size === 0) {
            return await interaction.reply({
              content: "This message has no attachments to rename.",
              ephemeral: true
            });
          }
          
          // Create a modal for renaming
          const { TextInputBuilder, ModalBuilder, TextInputStyle } = require('discord.js');
          
          const modal = new ModalBuilder()
            .setCustomId('rename_file_modal')
            .setTitle('Rename File');
          
          const fileNameInput = new TextInputBuilder()
            .setCustomId('file_name_input')
            .setLabel('New file name (without extension)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(100);
          
          const actionRow = new (require('discord.js')).ActionRowBuilder().addComponents(fileNameInput);
          modal.addComponents(actionRow);
          
          // Store attachment data using a Map keyed by user ID
          if (!this.pendingRenames) {
            this.pendingRenames = new Map();
          }
          
          this.pendingRenames.set(interaction.user.id, {
            attachments: Array.from(message.attachments.values()),
            timestamp: Date.now()
          });
          
          // Clean up old entries after 5 minutes
          setTimeout(() => {
            this.pendingRenames.delete(interaction.user.id);
          }, 5 * 60 * 1000);
          
          await interaction.showModal(modal);
          return;
        } else if (interaction.commandName === "Convert to GIF (rename)") {
           const message = interaction.targetMessage;
          
          // Check if message has attachments
          if (message.attachments.size === 0) {
            return await interaction.reply({
              content: "This message has no attachments to convert.",
              ephemeral: true
            });
          }
          
          // Get the gif command
          const gifCommand = this.commands.get('gif');
          if (!gifCommand) {
            return await interaction.reply({
              content: "GIF command not found.",
              ephemeral: true
            });
          }
          
          // Defer the actual interaction
          await interaction.deferReply();
          
          // Mark this as a batch conversion so gif command defers cleanup
          interaction._isBatchConversion = true;
          
          // Convert all attachments with rename-only enabled
          const attachments = Array.from(message.attachments.values());
          const results = [];
          const files = [];
          
          for (const attachment of attachments) {
            try {
              // Create interaction options wrapper for each attachment
              const mockInteraction = {
                options: {
                  getAttachment: (name) => name === 'file' ? attachment : null,
                  getString: () => null,
                  getBoolean: (name) => name === 'rename-only' ? true : false  // Enable rename-only
                },
                deferred: true,
                replied: false,
                deferReply: (opts) => Promise.resolve(),
                editReply: async (opts) => {
                  // Collect files from the response - read into buffers for batch mode
                  if (opts.files) {
                    for (const file of opts.files) {
                      try {
                        // Read file into buffer if it's an AttachmentBuilder with a file path
                        if (file.attachment && typeof file.attachment === 'string') {
                          const fileBuffer = await require('fs').promises.readFile(file.attachment);
                          const newAttachment = new (require('discord.js').AttachmentBuilder)(fileBuffer, { name: file.name });
                          files.push(newAttachment);
                        } else {
                          files.push(file);
                        }
                      } catch (err) {
                        console.error(`Error reading file for batch: ${err.message}`);
                        files.push(file);
                      }
                    }
                  }
                  results.push({ 
                    name: attachment.name || attachment.filename, 
                    success: true,
                    message: opts.content 
                  });
                  return Promise.resolve();
                },
                reply: (opts) => Promise.resolve(),
                user: interaction.user,
                channel: interaction.channel
              };
              
              // Override sendErrorResponse to collect errors
              mockInteraction.sendErrorResponse = async (itr, errorMessage) => {
                results.push({ 
                  name: attachment.name || attachment.filename, 
                  success: false, 
                  error: errorMessage 
                });
              };
              
              await gifCommand.execute(mockInteraction);
            } catch (error) {
              console.error(`Error converting ${attachment.name || attachment.filename}:`, error);
              results.push({ name: attachment.name || attachment.filename, success: false, error: error.message });
            }
          }
          
          // Build final summary message
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          let summaryContent = `✅ Converted ${successful}/${attachments.length} files (renamed)\n`;
          
          // Add details for each successful conversion
          results.filter(r => r.success).forEach(r => {
            summaryContent += `\n📄 **${r.name}**\n${r.message}`;
          });
          
          if (failed > 0) {
            summaryContent += `\n\n❌ Failed (${failed}):`;
            results.filter(r => !r.success).forEach(r => {
              summaryContent += `\n  • ${r.name}: ${r.error}`;
            });
          }
          
          // Send summary with all files at once
          await interaction.editReply({
            content: summaryContent,
            files: files
          });
          
          // Clean up deferred temp directories after sending
          if (global.deferredTempDirs && global.deferredTempDirs.length > 0) {
            const fs = require('fs');
            const path = require('path');
            
            const cleanupTempDir = (dirPath) => {
              try {
                if (fs.existsSync(dirPath)) {
                  fs.readdirSync(dirPath).forEach((file) => {
                    const filePath = path.join(dirPath, file);
                    if (fs.lstatSync(filePath).isDirectory()) {
                      cleanupTempDir(filePath);
                    } else {
                      fs.unlinkSync(filePath);
                    }
                  });
                  fs.rmdirSync(dirPath);
                }
              } catch (error) {
                console.error(`Error cleaning up temp directory: ${error.message}`);
              }
            };
            
            global.deferredTempDirs.forEach(dir => cleanupTempDir(dir));
            global.deferredTempDirs = [];
          }
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
