const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class FetchData extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'fetch_data';
    this.description = 'Fetches data from an API';
  }
  
  async execute(interaction) {
    try {
      const url = interaction.options.getString("url");
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        await this.sendResponse(interaction, {
          content: "Please provide a valid URL starting with http:// or https://"
        }, true);
        return;
      }
      
      const response = await axios.get(url);
      await this.sendResponse(interaction, {
        content: `\`\`\`json\n${JSON.stringify(response.data, null, 2)}\n\`\`\``
      });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to fetch data.");
    }
  }
}

module.exports = FetchData;
