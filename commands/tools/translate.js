const { EmbedBuilder } = require('discord.js');
const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class Translate extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'translate';
    this.description = 'Translate text between languages';
    this.cooldown = 5; // 5 second cooldown
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const text = interaction.options.getString("text");
      const targetLang = interaction.options.getString("to");
      const sourceLang = interaction.options.getString("from") || "auto";
      
      // Language codes to names for display
      const languageNames = {
        "en": "English",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "it": "Italian",
        "ja": "Japanese",
        "ru": "Russian",
        "zh": "Chinese",
        "ar": "Arabic",
        "tr": "Turkish",
        "auto": "Auto-detected"
      };
      
      // Using LibreTranslate API (open source alternative)
      // You can use other translation APIs like Google Cloud Translation, DeepL, etc.
      const response = await axios.post(
        'https://libretranslate.de/translate',
        {
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text"
        }
      );
      
      const embed = new EmbedBuilder()
        .setTitle("Translation")
        .setColor(0x546e7a)
        .addFields(
          { 
            name: `Original (${languageNames[sourceLang] || sourceLang})`, 
            value: text.length > 1024 ? text.substring(0, 1021) + "..." : text 
          },
          { 
            name: `Translation (${languageNames[targetLang] || targetLang})`, 
            value: response.data.translatedText.length > 1024 ? 
              response.data.translatedText.substring(0, 1021) + "..." : 
              response.data.translatedText
          }
        )
        .setFooter({ text: "Powered by LibreTranslate" });
      
      await this.sendResponse(interaction, { embeds: [embed] });
    } catch (error) {
      console.error("Translation error:", error);
      
      let errorMessage = "Failed to translate text. Please try again later.";
      
      // Handle specific API errors
      if (error.response?.status === 429) {
        errorMessage = "Translation service rate limit exceeded. Please try again later.";
      } else if (error.response?.status === 403) {
        errorMessage = "Translation service access denied.";
      } else if (error.response?.data?.error) {
        errorMessage = `Translation error: ${error.response.data.error}`;
      }
      
      await this.sendErrorResponse(interaction, errorMessage);
    }
  }
}

module.exports = Translate;
