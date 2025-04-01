const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class Urban extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'urban';
    this.description = 'Look up a term on Urban Dictionary';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const term = interaction.options.getString("term");
      const isRandom = interaction.options.getBoolean("random") || false;
      
      // API endpoint
      const endpoint = isRandom 
        ? "https://api.urbandictionary.com/v0/random" 
        : `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`;
      
      const response = await axios.get(endpoint);
      
      if (!response.data.list || response.data.list.length === 0) {
        await this.sendResponse(interaction, {
          content: `No definitions found for "${term}" on Urban Dictionary.`
        }, true);
        return;
      }
      
      // Sort by thumbs up count if there are multiple definitions
      const definitions = response.data.list.sort((a, b) => b.thumbs_up - a.thumbs_up);
      const definition = definitions[0];
      
      // Clean up the text by replacing square brackets with formatted links
      let cleanDefinition = definition.definition.replace(/\[([^\]]+)\]/g, '**$1**');
      let cleanExample = definition.example.replace(/\[([^\]]+)\]/g, '**$1**');
      
      // Truncate if too long
      if (cleanDefinition.length > 1024) {
        cleanDefinition = cleanDefinition.substring(0, 1021) + '...';
      }
      
      if (cleanExample.length > 1024) {
        cleanExample = cleanExample.substring(0, 1021) + '...';
      }
      
      // Create a rich embed
      const urbanEmbed = {
        title: isRandom ? definition.word : term,
        url: definition.permalink,
        color: 0xEFFF00, // Urban Dictionary yellow
        fields: [
          {
            name: "Definition",
            value: cleanDefinition || "No definition provided"
          }
        ],
        footer: {
          text: `👍 ${definition.thumbs_up} | 👎 ${definition.thumbs_down} | Written by ${definition.author}`,
          icon_url: "https://i.imgur.com/VFXr0ID.jpg"
        },
        timestamp: new Date(definition.written_on)
      };
      
      // Add example if it exists
      if (cleanExample && cleanExample.trim().length > 0) {
        urbanEmbed.fields.push({
          name: "Example",
          value: cleanExample
        });
      }
      
      // Add related definitions if there are more
      if (definitions.length > 1) {
        const relatedCount = Math.min(definitions.length - 1, 3);
        urbanEmbed.fields.push({
          name: `${relatedCount} More Definition${relatedCount > 1 ? 's' : ''}`,
          value: `This term has ${definitions.length} definitions. Use the link above to see them all.`
        });
      }
      
      // Add a warning that content might be offensive
      const warningMessage = "⚠️ **Note:** Urban Dictionary contains user-submitted content that may be offensive or inappropriate.";
      
      await this.sendResponse(interaction, { 
        content: warningMessage,
        embeds: [urbanEmbed] 
      });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Error fetching Urban Dictionary definition. Please try again later.");
    }
  }
}

module.exports = Urban;
