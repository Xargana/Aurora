const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');
const { AttachmentBuilder } = require('discord.js');

class Rename extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'rename';
    this.description = 'Rename a file by uploading or providing a link';
    this.cooldown = 3;
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      
      // Get options
      const uploadedFile = interaction.options.getAttachment("file");
      const url = interaction.options.getString("url");
      const newName = interaction.options.getString("newname");
      
      // Validate inputs
      if (!newName) {
        await this.sendErrorResponse(interaction, "Please provide a new name for the file.");
        return;
      }
      
      if (!uploadedFile && !url) {
        await this.sendErrorResponse(interaction, "Please provide either a file upload or a URL.");
        return;
      }
      
      if (uploadedFile && url) {
        await this.sendErrorResponse(interaction, "Please provide either a file upload OR a URL, not both.");
        return;
      }
      
      let fileData;
      let originalFileName;
      
      if (uploadedFile) {
        // Download the uploaded file
        try {
          const response = await axios.get(uploadedFile.url, { responseType: 'arraybuffer' });
          fileData = response.data;
          originalFileName = uploadedFile.name;
        } catch (error) {
          await this.sendErrorResponse(interaction, `Failed to download file: ${error.message}`);
          return;
        }
      } else if (url) {
        // Download from URL
        try {
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          fileData = response.data;
          // Extract filename from URL or use default
          originalFileName = url.split('/').pop()?.split('?')[0] || 'file';
        } catch (error) {
          await this.sendErrorResponse(interaction, `Failed to download file from URL: ${error.message}`);
          return;
        }
      }
      
      // Extract extension from original filename
      const ext = originalFileName.includes('.') 
        ? originalFileName.substring(originalFileName.lastIndexOf('.'))
        : '';
      
      // Create new filename with original extension
      const renamedFileName = newName + ext;
      
      // Create attachment and send
      const attachment = new AttachmentBuilder(fileData, { name: renamedFileName });
      
      await this.sendResponse(interaction, {
        content: `✅ File renamed to: **${renamedFileName}**`,
        files: [attachment]
      });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, `Failed to rename file: ${error.message}`);
    }
  }
}

module.exports = Rename;
