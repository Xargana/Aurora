const { google } = require('googleapis');

class GoogleSearch extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'search';
    this.description = 'Search the web using Google';
    
    // API keys should be stored in environment variables
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const query = interaction.options.getString("query");
      const safeSearch = interaction.options.getString("safe") || "moderate";
      
      // Initialize Google Custom Search
      const customsearch = google.customsearch('v1');
      
      // Perform the search
      const response = await customsearch.cse.list({
        auth: this.apiKey,
        cx: this.searchEngineId,
        q: query,
        safe: safeSearch,
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
          value: `[${result.link}](${result.link})\n${result.snippet || 'No description available'}`
        })),
        footer: {
          text: "Google Search"
        },
        timestamp: new Date()
      };
      
      await this.sendResponse(interaction, { embeds: [searchEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Error performing Google search. Please try again later.");
    }
  }
}

module.exports = GoogleSearch;