const CommandBase = require('../../classes/CommandBase');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);
const Utils = require('../../classes/Utils');

class Hash extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'hash';
    this.description = 'Generate hash of text or file (up to 500MB)';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const algorithm = interaction.options.getString("algorithm");
      const text = interaction.options.getString("text");
      const file = interaction.options.getAttachment("file");
      
      // Validate that either text or file is provided
      if (!text && !file) {
        await this.sendErrorResponse(interaction, "Please provide either text or a file to hash.");
        return;
      }
      
      // If both are provided, prioritize the file
      if (text && file) {
        await interaction.followUp({
          content: "Both text and file were provided. Processing the file and ignoring the text.",
          ephemeral: true
        });
      }
      
      // For text input, generate hash directly
      if (text && !file) {
        const hash = crypto.createHash(algorithm).update(text).digest('hex');
        
        const hashEmbed = {
          title: `${algorithm.toUpperCase()} Hash`,
          description: "Text hash generated successfully",
          color: 0x3498db,
          fields: [
            {
              name: "Input Text",
              value: text.length > 1024 ? text.substring(0, 1021) + "..." : text
            },
            {
              name: "Hash",
              value: "```\n" + hash + "\n```"
            }
          ],
          timestamp: new Date(),
          footer: { text: `Algorithm: ${algorithm.toUpperCase()}` }
        };
        
        await this.sendResponse(interaction, { embeds: [hashEmbed] });
        return;
      }
      
      // For file input, download and hash the file
      if (file) {
        // Check file size (500MB limit)
        const maxSize = 500 * 1024 * 1024; // 500MB in bytes
        if (file.size > maxSize) {
          await this.sendErrorResponse(interaction, 
            `File is too large. Maximum size is 500MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
          );
          return;
        }
        
        // If file is larger than 25MB, warn the user it might take a while
        if (file.size > 25 * 1024 * 1024) {
          await this.sendResponse(interaction, {
            content: `Processing a ${(file.size / (1024 * 1024)).toFixed(2)}MB file. This might take a while...`
          });
        }
        
        // Create a temporary file path
        const tempFile = Utils.getTempFilePath(`${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
        
        try {
          // Download the file
          const writer = fs.createWriteStream(tempFile);
          const response = await axios({
            method: 'GET',
            url: file.url,
            responseType: 'stream'
          });
          
          await pipeline(response.data, writer);
          
          // After download completes, hash the file with progress updates
          const fileSize = fs.statSync(tempFile).size;
          const hash = crypto.createHash(algorithm);
          const input = fs.createReadStream(tempFile);
          
          let processedBytes = 0;
          let lastProgressUpdate = Date.now();
          
          input.on('data', (chunk) => {
            hash.update(chunk);
            processedBytes += chunk.length;
            
            // Update progress every 3 seconds for files larger than 50MB
            const now = Date.now();
            if (fileSize > 50 * 1024 * 1024 && now - lastProgressUpdate > 3000) {
              const progress = (processedBytes / fileSize * 100).toFixed(2);
              this.sendResponse(interaction, {
                content: `Processing file: ${progress}% complete...`
              }).catch(console.error);
              lastProgressUpdate = now;
            }
          });
          
          // Wait for the hash to complete
          const hashHex = await new Promise((resolve, reject) => {
            input.on('end', () => resolve(hash.digest('hex')));
            input.on('error', reject);
          });
          
          // Clean up the temp file
          fs.unlinkSync(tempFile);
          
          // Create the response embed
          const fileExtension = path.extname(file.name).toLowerCase();
          const hashEmbed = {
            title: `${algorithm.toUpperCase()} Hash Generated`,
            description: "File hash calculated successfully",
            color: 0x00ff00,
            fields: [
              {
                name: "File",
                value: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
              },
              {
                name: "Hash",
                value: "```\n" + hashHex + "\n```"
              }
            ],
            timestamp: new Date(),
            footer: { text: `Algorithm: ${algorithm.toUpperCase()}` }
          };
          
          await this.sendResponse(interaction, { embeds: [hashEmbed] });
        } catch (fileError) {
          console.error("File processing error:", fileError);
          
          // Clean up temp file if it exists
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
          
          await this.sendErrorResponse(interaction, "Error processing file. The file might be inaccessible or corrupted.");
        }
      }
    } catch (error) {
      console.error("Hash command error:", error);
      await this.sendErrorResponse(interaction, "Error generating hash. Please try again with a smaller file or different input.");
    }
  }
}

module.exports = Hash;
