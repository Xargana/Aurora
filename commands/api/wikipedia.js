const CommandBase = require('../../classes/CommandBase');
const wikipedia = require('wikipedia');

class Wikipedia extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'wikipedia';
    this.description = 'Get a summary of a Wikipedia article';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const query = interaction.options.getString("query");
      const language = interaction.options.getString("language") || "en";
      
      // Set the language
      wikipedia.setLang(language);
      
      // Search for the query
      const searchResults = await wikipedia.search(query);
      
      if (!searchResults.results || searchResults.results.length === 0) {
        await this.sendResponse(interaction, {
          content: `No results found for "${query}" on Wikipedia.`
        }, true);
        return;
      }
      
      // Get the first result
      const page = await wikipedia.page(searchResults.results[0].title);
      
      // Get summary and basic info
      const summary = await page.summary();
      
      // Create a rich embed
      const wikiEmbed = {
        title: summary.title,
        url: summary.content_urls.desktop.page,
        description: summary.extract.length > 1000 
          ? summary.extract.substring(0, 1000) + "..." 
          : summary.extract,
        color: 0x0099ff,
        thumbnail: summary.thumbnail 
          ? { url: summary.thumbnail.source } 
          : null,
        fields: [
          {
            name: "Page ID",
            value: summary.pageid.toString(),
            inline: true
          },
          {
            name: "Language",
            value: language.toUpperCase(),
            inline: true
          }
        ],
        footer: {
          text: "Powered by Wikipedia",
          icon_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/103px-Wikipedia-logo-v2.svg.png"
        },
        timestamp: new Date()
      };
      
      // Add a related articles field if we have other search results
      if (searchResults.results.length > 1) {
        const relatedArticles = searchResults.results
          .slice(1, 4)  // Get 3 related articles
          .map(result => `[${result.title}](https://${language}.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))})`)
          .join('\n');
        
        wikiEmbed.fields.push({
          name: "Related Articles",
          value: relatedArticles
        });
      }
      
      await this.sendResponse(interaction, { embeds: [wikiEmbed] });
    } catch (error) {
      console.error(error);
      
      // Handle specific Wikipedia errors
      if (error.message.includes("No article found")) {
        await this.sendErrorResponse(interaction, "Couldn't find a specific Wikipedia article with that title. Try a different search term.");
      } else {
        await this.sendErrorResponse(interaction, "Error fetching Wikipedia data. Please try again later.");
      }
    }
  }
}

module.exports = Wikipedia;
