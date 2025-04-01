const CommandBase = require('../../classes/CommandBase');
const dns = require('dns');

class CheckDns extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'checkdns';
    this.description = 'Check if a domain is blocked by running it through a DNS server';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const domain = interaction.options.getString("domain");
      const provider = interaction.options.getString("provider") || "1.1.1.1";
      
      const resolver = new dns.Resolver();
      resolver.setServers([provider]);

      resolver.resolve4(domain, async (err, addresses) => {
        if (err) {
          const dnsEmbed = {
            title: "DNS Lookup Result",
            description: `Domain: ${domain}\nProvider: ${provider}`,
            color: 0xFF0000,
            fields: [
              {
                name: "Status",
                value: "❌ Domain is blocked or unreachable",
                inline: true
              },
              {
                name: "Error",
                value: err.code,
                inline: true
              }
            ],
            timestamp: new Date(),
            footer: { text: "DNS Check Service" }
          };
          await this.sendResponse(interaction, { embeds: [dnsEmbed] });
        } else {
          const dnsEmbed = {
            title: "DNS Lookup Result", 
            description: `Domain: ${domain}\nProvider: ${provider}`,
            color: 0x00FF00,
            fields: [
              {
                name: "Status",
                value: "✅ Domain is accessible",
                inline: true
              },
              {
                name: "IP Addresses",
                value: addresses.join('\n'),
                inline: true
              }
            ],
            timestamp: new Date(),
            footer: { text: "DNS Check Service" }
          };
          await this.sendResponse(interaction, { embeds: [dnsEmbed] });
        }
      });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to perform DNS lookup. Please check the domain name and try again.");
    }
  }
}

module.exports = CheckDns;
