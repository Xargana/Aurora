const { ApplicationCommandOptionType } = require('discord.js');
const { v1: uuidv1, v4: uuidv4 } = require('uuid');
const CommandBase = require('../../classes/CommandBase');

class UuidGenerator extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'uuid';
    this.description = 'Generate a UUID (Universally Unique Identifier)';
    this.options = [
      {
        name: 'version',
        description: 'The UUID version to generate',
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: 'v1 (time-based)', value: 'v1' },
          { name: 'v4 (random)', value: 'v4' }
        ]
      },
      {
        name: 'count',
        description: 'Number of UUIDs to generate (max 10)',
        type: ApplicationCommandOptionType.Integer,
        required: false,
        min_value: 1,
        max_value: 10
      }
    ];
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const version = interaction.options.getString("version") || "v4";
      const count = interaction.options.getInteger("count") || 1;
      
      // Generate UUIDs based on version
      const uuids = [];
      for (let i = 0; i < count; i++) {
        if (version === 'v1') {
          uuids.push(uuidv1());
        } else {
          uuids.push(uuidv4());
        }
      }
      
      // Create the embed response
      const uuidEmbed = {
        title: `UUID Generator - ${version.toUpperCase()}`,
        description: `Generated ${count} UUID${count > 1 ? 's' : ''}:`,
        color: 0x3498db,
        fields: uuids.map((uuid, index) => ({
          name: `UUID ${index + 1}`,
          value: `\`${uuid}\``
        })),
        footer: {
          text: "UUID Generator"
        },
        timestamp: new Date()
      };
      
      await this.sendResponse(interaction, { embeds: [uuidEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to generate UUID. Please try again.");
    }
  }
}

module.exports = UuidGenerator;