const rateLimiter = require('./rateLimiter');

class CommandBase {
  constructor(client) {
    this.client = client;
    this.name = '';
    this.description = '';
    this.category = '';
    // Default cooldown of 2 seconds
    this.cooldown = 2;
  }
  
  /**
   * Execute the command
   * @param {Interaction} interaction - The Discord interaction
   */
  async execute(interaction) {
    // Check rate limit before executing
    const userId = interaction.user.id;
    const { isLimited, remainingTime } = rateLimiter.isRateLimited(
      userId, 
      this.name, 
      this.cooldown
    );
    
    if (isLimited) {
      await this.sendErrorResponse(
        interaction, 
        `Please wait ${remainingTime} more seconds before using this command again.`,
        true
      );
      return;
    }
    
    // If not rate limited, continue with command execution
    // This should be overridden by child classes
    await this.sendResponse(interaction, { content: 'Command not implemented.' });
  }
  
  /**
   * Defer the reply to the interaction
   * @param {Interaction} interaction - The Discord interaction
   * @param {boolean} ephemeral - Whether the response should be ephemeral
   */
  async deferReply(interaction, ephemeral = false) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral });
    }
  }
  
  /**
   * Send a response to the interaction
   * @param {Interaction} interaction - The Discord interaction
   * @param {Object} responseOptions - The response options
   * @param {boolean} ephemeral - Whether the response should be ephemeral
   */
  async sendResponse(interaction, responseOptions, ephemeral = false) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(responseOptions);
      } else {
        responseOptions.ephemeral = ephemeral;
        await interaction.reply(responseOptions);
      }
    } catch (error) {
      console.error(`Error sending response for command ${this.name}:`, error);
    }
  }
  
  /**
   * Send an error response to the interaction
   * @param {Interaction} interaction - The Discord interaction
   * @param {string} errorMessage - The error message
   * @param {boolean} ephemeral - Whether the response should be ephemeral
   */
  async sendErrorResponse(interaction, errorMessage, ephemeral = true) {
    const errorResponse = {
      content: `❌ ${errorMessage}`,
      ephemeral: ephemeral
    };
    
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorResponse);
      } else {
        await interaction.reply(errorResponse);
      }
    } catch (error) {
      console.error(`Error sending error response for command ${this.name}:`, error);
    }
  }
  
  /**
   * Clean text input
   * @param {string} text - The text to clean
   * @returns {string} - The cleaned text
   */
  clean(text) {
    if (!text) return '';
    return text.trim();
  }
  
  /**
   * Set a custom cooldown for this command
   * @param {number} seconds - Cooldown in seconds
   */
  setCooldown(seconds) {
    this.cooldown = seconds;
    return this;
  }
}

module.exports = CommandBase;
