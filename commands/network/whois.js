const CommandBase = require('../../classes/CommandBase');
const whois = require('whois-json');

class Whois extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'whois';
    this.description = 'Get domain registration information';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const domain = interaction.options.getString("domain");
      
      const result = await whois(domain);
      
      const whoisEmbed = {
        title: `WHOIS Lookup: ${domain}`,
        color: 0x2ecc71,
        fields: [
          {
            name: "Registrar",
            value: result.registrar || "Not available",
            inline: true
          },
          {
            name: "Creation Date",
            value: result.creationDate ? new Date(result.creationDate).toLocaleDateString() : "Not available",
            inline: true
          },
          {
            name: "Expiration Date",
            value: result.expirationDate ? new Date(result.expirationDate).toLocaleDateString() : "Not available",
            inline: true
          },
          {
            name: "Name Servers",
            value: Array.isArray(result.nameServers) ? result.nameServers.join('\n') : "Not available"
          },
          {
            name: "Status",
            value: Array.isArray(result.status) ? result.status.join('\n') : (result.status || "Not available")
          }
        ],
        timestamp: new Date(),
        footer: { text: "Domain Information Service" }
      };
      
      await this.sendResponse(interaction, { embeds: [whoisEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to fetch WHOIS information. Please check the domain name and try again.");
    }
  }
}

module.exports = Whois;
