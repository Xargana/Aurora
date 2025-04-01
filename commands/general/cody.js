const CommandBase = require('../../classes/CommandBase');
const Utils = require('../../classes/Utils');

class Cody extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'cody';
    this.description = 'Ask Cody (Sourcegraph AI) a coding question';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const question = interaction.options.getString("question");
      
      if (!process.env.SOURCEGRAPH_API_KEY) {
        await this.sendErrorResponse(interaction, 
          "Sourcegraph API key not configured. Please add SOURCEGRAPH_API_KEY to your environment variables."
        );
        return;
      }
      
      console.log(`Asking Cody: ${question}`);
      
      // Call Cody API
      const codyResponse = await Utils.askCody(question);
      
      console.log(`Cody response received: ${codyResponse ? 'yes' : 'no'}`);
      
      // Format the response
      let formattedResponse = codyResponse || "No response received from Cody.";
      
      // Calculate total length including the question
      const fullResponse = `**Question:** ${question}\n\n**Cody's Answer:**\n${formattedResponse}`;
      
      // If the response is too long for Discord (which has a 2000 character limit)
      if (fullResponse.length > 1900) {
        formattedResponse = formattedResponse.substring(0, 1900 - question.length - 50) + "...\n(Response truncated due to Discord's character limit)";
      }
      
      await this.sendResponse(interaction, { 
        content: `**Question:** ${question}\n\n**Cody's Answer:**\n${formattedResponse}`
      });
    } catch (error) {
      console.error("Cody API error:", error);
      await this.sendErrorResponse(interaction, 
        "Sorry, I couldn't get an answer from Cody. Please try again later."
      );
    }
  }
}

module.exports = Cody;
