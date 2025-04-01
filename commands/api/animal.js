const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class Animal extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'animal';
    this.description = 'Get a random animal image';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const animalType = interaction.options.getString("type");
      
      const imageResponse = await axios.get(`https://some-random-api.com/animal/${animalType}`);
      const imageUrl = imageResponse.data.image;
      
      const animalEmbed = {
        color: 0x3498db,
        image: { url: imageUrl },
        footer: { text: 'Powered by some-random-api.com' },
        timestamp: new Date()
      };
      
      await this.sendResponse(interaction, { embeds: [animalEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to fetch animal image. The API might be down or the animal type is not available.");
    }
  }
}

module.exports = Animal;
