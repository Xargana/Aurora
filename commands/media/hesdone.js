const CommandBase = require('../../classes/CommandBase');
const sharp = require('sharp');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

class hesdone extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'hesdone';
    this.description = "he's so fucking done";
    this.category = 'media';
    this.cooldown = 2;
  }

  async execute(interaction) {
    try {
      await this.deferReply(interaction);

      const targetUser = interaction.options.getUser('user');
      if (!targetUser) {
        return this.sendErrorResponse(interaction, 'You must specify a user.');
      }

      // Load base template image from assets
      const basePath = path.join(__dirname, '../../assets/hesdone.png');
      if (!fs.existsSync(basePath)) {
        return this.sendErrorResponse(interaction, 'Template image is missing.');
      }

      const baseBuffer = fs.readFileSync(basePath);

      // Fetch user avatar
      const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 512 });
      const avatarBuffer = Buffer.from(await (await fetch(avatarURL)).arrayBuffer());

      // Prepare base image
      const baseImage = sharp(baseBuffer);
      const baseMeta = await baseImage.metadata();

      // Resize avatar
      const avatarSize = Math.floor(baseMeta.width * 0.35);
      const avatarResized = await sharp(avatarBuffer)
        .resize(avatarSize, avatarSize)
        .png()
        .toBuffer();

      // Optional: make avatar circular
      const circleMask = Buffer.from(
        `<svg width="${avatarSize}" height="${avatarSize}">
          <circle cx="${avatarSize/2}" cy="${avatarSize/2}" r="${avatarSize/2}" fill="white"/>
        </svg>`
      );

      const avatarCircular = await sharp(avatarResized)
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .toBuffer();

      // Composite onto template
      const finalImage = await baseImage
        .composite([{
          input: avatarCircular,
          top: 280,  // adjust position
          left: 1550   // adjust position
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
      console.error('Error in hesdone command:', error);
      await this.sendErrorResponse(
        interaction,
        `Image processing failed: ${error.message}`
      );
    }
  }
}

module.exports = hesdone;
