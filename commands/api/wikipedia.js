const CommandBase = require('../../classes/CommandBase');
const axios = require("axios");

class Wikipedia extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'wikipedia';
    this.description = 'Get a summary of a Wikipedia article';
  }
  
  async execute(interaction) {
  await this.deferReply(interaction);

  const query = interaction.options.getString("query");
  const language = interaction.options.getString("language") || "en";

  try {
    const res = await axios.get(
      `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Aurora/1.0 (https://xargana.tr; webmaster@xargana.tr)"
        }
      }
    );

    const summary = res.data;

    if (summary.type === "disambiguation") {
      return this.sendResponse(interaction, {
        content: `That term is ambiguous. Try being more specific.`
      }, true);
    }

    const wikiEmbed = {
      title: summary.title,
      url: summary.content_urls.desktop.page,
      description: summary.extract.length > 1000
        ? summary.extract.slice(0, 1000) + "..."
        : summary.extract,
      color: 0x0099ff,
      thumbnail: summary.thumbnail
        ? { url: summary.thumbnail.source }
        : null,
      fields: [
        {
          name: "Page ID",
          value: summary.pageid?.toString() ?? "N/A",
          inline: true
        },
        {
          name: "Language",
          value: language.toUpperCase(),
          inline: true
        }
      ],
      footer: {
        text: "Powered by Wikipedia"
      },
      timestamp: new Date()
    };

    await this.sendResponse(interaction, { embeds: [wikiEmbed] });

  } catch (err) {
    if (err.response?.status === 404) {
      return this.sendErrorResponse(
        interaction,
        `No Wikipedia article found for "${query}".`
      );
    }

    console.error(err);
    await this.sendErrorResponse(
      interaction,
      "Error fetching Wikipedia data. Try again later."
    );
  }
}

}

module.exports = Wikipedia;
