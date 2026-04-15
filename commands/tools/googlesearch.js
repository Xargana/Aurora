const { google } = require('googleapis');
const CommandBase = require('../../classes/CommandBase');

class GoogleSearch extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'search';
    this.description = 'Search the web using Google';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const query = interaction.options.getString("query");
      
      // Get API keys from environment variables
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      // Validate that API keys are set
      if (!apiKey || !searchEngineId) {
        await this.sendErrorResponse(interaction, "Google Search API is not properly configured.");
        return;
      }
      
      // Initialize Google Custom Search
      const customsearch = google.customsearch('v1');
      
      // Perform the search
      const response = await customsearch.cse.list({
        auth: apiKey,
        cx: searchEngineId,
        q: query,
        num: 5 // Number of results to return
      });
      
      const searchResults = response.data.items || [];
      
      if (searchResults.length === 0) {
        await this.sendResponse(interaction, {
          content: "No results found for your search query."
        });
        return;
      }
      
      // Create a rich embed with search results
      const searchEmbed = {
        title: `Google Search Results for "${query}"`,
        color: 0x4285F4, // Google blue
        fields: searchResults.map((result, index) => ({
          name: `${index + 1}. ${result.title}`,
          // Just show the URL directly without any markdown formatting
          value: `${result.snippet || 'No description available'}\n${result.link}`
        })),
        footer: {
          text: "Google Search"
        },
        timestamp: new Date()
      };
      
      await this.sendResponse(interaction, { embeds: [searchEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Error performing Google search. Please check your API configuration or try again later.");
    }
  }
}

module.exports = GoogleSearch;
