const CommandBase = require('../../classes/CommandBase');

/**
 * Example Command
 * 
 * This is a template command showing the basic structure and patterns used in the bot.
 * To enable this command, add it to config/commandDefinitions.js in the globalCommands array.
 */
class Example extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'example';
    this.description = 'An example command template';
    this.category = 'utility';
    this.cooldown = 3; // Set cooldown in seconds (default is 2)
  }

  /**
   * Execute the command
   * @param {Interaction} interaction - The Discord interaction
   */
  async execute(interaction) {
    try {
      // Defer the reply if you need time to process
      await this.deferReply(interaction);

      // Check if in dev mode
      if (this.isDev()) {
        console.log('[Example] Running in dev mode');
      }

      // Get command options
      const textInput = interaction.options.getString('text');
      const numberInput = interaction.options.getInteger('number');
      const booleanInput = interaction.options.getBoolean('flag');

      // Example API call (replace with actual logic)
      // const response = await axios.get('https://api.example.com/data');
      // const data = response.data;

      // Build response
      const responseMessage = {
        content: `Text: ${textInput}\nNumber: ${numberInput}\nFlag: ${booleanInput}`
      };

      // Send response
      await this.sendResponse(interaction, responseMessage);

      console.log(`[Example] Command executed successfully for user ${interaction.user.id}`);
    } catch (error) {
      console.error('Error in example command:', error);
      await this.sendErrorResponse(
        interaction,
        `An error occurred: ${error.message}`
      );
    }
  }
}

module.exports = Example;
