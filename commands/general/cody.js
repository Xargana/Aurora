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
      let model = interaction.options.getString("model") || null;
      
      if (!process.env.SOURCEGRAPH_API_KEY) {
        await this.sendErrorResponse(interaction, 
          "Sourcegraph API key not configured. Please add SOURCEGRAPH_API_KEY to your environment variables."
        );
        return;
      }
      
      // Log with or without model information
      if (model) {
        console.log(`Asking Cody (model: ${model}): ${question}`);
      } else {
        console.log(`Asking Cody (default model): ${question}`);
      }
      
      // Initial message to show the question and indicate processing
      const modelText = model ? ` (${model})` : '';
      await this.sendResponse(interaction, { 
        content: `**Question:** ${question}\n\n**Cody's Answer${modelText}:**\n⌛ Thinking...`
      });
      
      // Define a stream callback for real-time updates
      let lastUpdate = Date.now();
      const updateInterval = 1000; // Update at most once per second to avoid rate limits
      
      const streamCallback = async (currentResponse) => {
        // Ensure we don't update too frequently
        const now = Date.now();
        if (now - lastUpdate < updateInterval) {
          return;
        }
        
        lastUpdate = now;
        
        // Format the current response
        let formattedResponse = currentResponse || "No response received from Cody yet.";
        
        // Calculate total length including the question
        const fullResponse = `**Question:** ${question}\n\n**Cody's Answer${modelText}:**\n${formattedResponse}`;
        
        // If the response is too long for Discord (which has a 2000 character limit)
        if (fullResponse.length > 1900) {
          formattedResponse = formattedResponse.substring(0, 1900 - question.length - 100) + 
            "...\n\n⌛ *Response exceeds Discord limit, still generating...*";
        }
        
        try {
          // Update the message with the current state of the response
          await interaction.editReply({ 
            content: `**Question:** ${question}\n\n**Cody's Answer${modelText}:**\n${formattedResponse}`
          });
        } catch (err) {
          console.error("Error updating message:", err);
        }
      };
      
      // Call Cody API with streaming
      const codyResponse = await Utils.askCody(question, model, streamCallback);
      
      console.log(`Cody response completed: ${codyResponse ? 'yes' : 'no'}`);
      
      // Format the final response
      let formattedResponse = codyResponse || "No response received from Cody.";
      
      // Calculate total length including the question
      const fullResponse = `**Question:** ${question}\n\n**Cody's Answer${modelText}:**\n${formattedResponse}`;
      
      // If the response is too long for Discord (which has a 2000 character limit)
      if (fullResponse.length > 1900) {
        formattedResponse = formattedResponse.substring(0, 1900 - question.length - 50) + 
          "...\n(Response truncated due to Discord's character limit)";
      }
      
      // Final update with complete response
      await interaction.editReply({ 
        content: `**Question:** ${question}\n\n**Cody's Answer${modelText}:**\n${formattedResponse}`
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
