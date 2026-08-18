const CommandBase = require('../../classes/CommandBase');
const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

class kidnap extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'kidnap';
    this.description = 'syfm';
    this.category = 'media';
    this.cooldown = 2;
  }

  async execute(interaction) {
    try {
      await this.deferReply(interaction);

      let imageBuffer;

      const targetUser = interaction.options.getUser('user');
      const attachment = interaction.options.getAttachment('attachment');

      if (!attachment && !targetUser) {
        return await this.sendErrorResponse(interaction, 'Please provide either a file or a user to convert.');
      }

      if (attachment && targetUser) {
        return await this.sendErrorResponse(interaction, 'Please provide either a file or a user, not both.');
      }

      if (targetUser) {
        const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 512 });
        imageBuffer = Buffer.from(await (await fetch(avatarURL)).arrayBuffer());
      } else {
        imageBuffer = Buffer.from(await (await fetch(attachment.url)).arrayBuffer());
      }

      const basePath = path.join(__dirname, '../../assets/kidnap.png');
      if (!fs.existsSync(basePath)) {
        return this.sendErrorResponse(interaction, 'Template image is missing.');
      }

      const baseBuffer = fs.readFileSync(basePath);

      const imageSize = 177;

      const resizedBuffer = await sharp(imageBuffer)
        .resize(imageSize, imageSize)
          .greyscale()
        .linear(2.0, -130)
        .png()
        .toBuffer();

      const finalImage = await sharp(baseBuffer)
        .composite([{
          input: resizedBuffer,
          top: 54,
          left: 110
        }])
        .png()
        .toBuffer();

      await interaction.editReply({
        files: [{
          attachment: finalImage,
          name: 'result.png'
        }]
      });

    } catch (error) {
      console.error('Error in kidnap command:', error);
      await this.sendErrorResponse(
        interaction,
        `Image processing failed: ${error.message}`
      );
    }
  }
}

module.exports = kidnap;
