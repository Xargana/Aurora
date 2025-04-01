const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class Anime extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'anime';
    this.description = 'Get anime-related content';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const type = interaction.options.getString("type");
      
      let apiUrl;
      let isQuote = false;
      
      if (type === "quote") {
        apiUrl = "https://some-random-api.ml/animu/quote";
        isQuote = true;
      } else {
        apiUrl = `https://some-random-api.ml/animu/${type}`;
      }
      
      const response = await axios.get(apiUrl);
      
      if (isQuote) {
        const quote = response.data.sentence;
        const character = response.data.character;
        const anime = response.data.anime;
        
        const quoteEmbed = {
          title: "Anime Quote",
          description: `"${quote}"`,
          fields: [
            { name: "Character", value: character, inline: true },
            { name: "Anime", value: anime, inline: true }
          ],
          color: 0xe74c3c,
          footer: { text: 'Powered by some-random-api.ml' },
          timestamp: new Date()
        };
        
        await this.sendResponse(interaction, { embeds: [quoteEmbed] });
      } else {
        const gifUrl = response.data.link;
        
        const actionTitle = type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
        
        const gifEmbed = {
          title: `Anime ${actionTitle}`,
          color: 0xe74c3c,
          image: { url: gifUrl },
          footer: { text: 'Powered by some-random-api.ml' },
          timestamp: new Date()
        };
        
        await this.sendResponse(interaction, { embeds: [gifEmbed] });
      }
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to fetch anime content. The API might be down or the requested action is not available.");
    }
  }
}

module.exports = Anime;
