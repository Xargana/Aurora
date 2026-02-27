const CommandBase = require('../../classes/CommandBase');
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

class Gif extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'gif';
    this.description = 'Convert images or videos to GIF format';
    this.category = 'media';
    this.cooldown = 5;
  }

  async execute(interaction) {
    try {
      await this.deferReply(interaction);

      const startTime = Date.now();

      // Get attachment and options
      const attachment = interaction.options.getAttachment('file');
      const urlInput = interaction.options.getString('url');
      const renameOnly = interaction.options.getBoolean('rename-only') || false;

      if (!attachment && !urlInput) {
        return await this.sendErrorResponse(interaction, 'Please provide either a file or a URL to convert.');
      }

      if (attachment && urlInput) {
        return await this.sendErrorResponse(interaction, 'Please provide either a file or a URL, not both.');
      }

      // Create temp directory
      const tempDir = path.join(process.cwd(), 'temp_gif_' + Date.now());
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      try {
        let filename;
        let inputPath;
        let fileExt;

        if (attachment) {
          filename = attachment.name || attachment.filename || 'file';
          inputPath = path.join(tempDir, 'input' + path.extname(filename).toLowerCase());
          fileExt = path.extname(filename).toLowerCase();

          console.log(`[GIF] Processing attachment: ${filename}`);
          console.log(`[GIF] Downloading attachment from Discord...`);

          // Download file
          await this.downloadFile(attachment.url, inputPath);
        } else {
          console.log(`[GIF] Processing URL: ${urlInput}`);
          console.log(`[GIF] Detecting media type from URL...`);

          // Detect media type from URL
          const mediaInfo = await this.detectMediaType(urlInput);
          if (!mediaInfo.isValid) {
            return await this.sendErrorResponse(
              interaction,
              `Invalid media type. Supported: Images (PNG, JPG, BMP, WebP) or Videos (MP4, AVI, MOV, MKV, FLV, WMV, WebM).`
            );
          }

          filename = mediaInfo.filename;
          fileExt = mediaInfo.extension;
          inputPath = path.join(tempDir, 'input' + fileExt);

          console.log(`[GIF] Detected as ${mediaInfo.type}: ${filename} (${mediaInfo.contentType})`);
          console.log(`[GIF] Downloading from URL...`);

          // Download file from URL
          await this.downloadFile(urlInput, inputPath);
        }

        const imageExtensions = ['.png', '.jpg', '.jpeg', '.bmp', '.webp'];
        const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm'];

        const isImage = imageExtensions.includes(fileExt);
        const isVideo = videoExtensions.includes(fileExt);

        if (!isImage && !isVideo) {
          return await this.sendErrorResponse(
            interaction,
            'Unsupported file format. Please use an image (PNG, JPG, BMP, WebP) or video (MP4, AVI, MOV, MKV, FLV, WMV, WebM).'
          );
        }

        // Validate rename-only option
        if (renameOnly && !isImage) {
          return await this.sendErrorResponse(
            interaction,
            'The rename-only option only works with images, not videos.'
          );
        }

        // Check file size (limit to 500MB to avoid overloading)
        const fileSize = fs.statSync(inputPath).size;
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        console.log(`[GIF] File size: ${fileSizeMB}MB`);

        if (fileSize > 500 * 1024 * 1024) {
          return await this.sendErrorResponse(
            interaction,
            'File size exceeds 500MB limit. Please use a smaller file.'
          );
        }

        const outputPath = path.join(tempDir, 'output.gif');
        let conversionStartTime;

        // Handle rename-only option for images
        if (renameOnly && isImage) {
          console.log(`[GIF] Renaming image to GIF (no re-encoding)...`);
          conversionStartTime = Date.now();
          // Just copy and rename
          fs.copyFileSync(inputPath, outputPath.replace('.gif', fileExt));
          fs.renameSync(outputPath.replace('.gif', fileExt), outputPath);
        } else if (isImage && !renameOnly) {
          console.log(`[GIF] Converting image to GIF with optimization...`);
          conversionStartTime = Date.now();
          // Convert image to GIF with ffmpeg
          await this.convertWithFFmpeg(inputPath, outputPath, false);
        } else if (isVideo) {
          console.log(`[GIF] Converting video to GIF (10fps, 320px width)...`);
          conversionStartTime = Date.now();
          // Convert video to GIF with ffmpeg
          await this.convertWithFFmpeg(inputPath, outputPath, true);
        }

        const conversionTime = Date.now() - conversionStartTime;
        console.log(`[GIF] Conversion completed in ${(conversionTime / 1000).toFixed(2)}s`);

        if (!fs.existsSync(outputPath)) {
          return await this.sendErrorResponse(
            interaction,
            'Failed to convert file to GIF. The file may be corrupted or in an unsupported format.'
          );
        }

        // Check output size
        const outputSize = fs.statSync(outputPath).size;
        const outputSizeMB = (outputSize / (1024 * 1024)).toFixed(2);
        console.log(`[GIF] Output size: ${outputSizeMB}MB`);

        if (outputSize > 25 * 1024 * 1024) {
          // Discord's 25MB limit
          return await this.sendErrorResponse(
            interaction,
            'Converted GIF is too large to upload (>25MB). Try with a shorter/smaller video or image.'
          );
        }

        // Send GIF
        const attachment_out = new AttachmentBuilder(outputPath, {
          name: path.basename(filename, fileExt) + '.gif'
        });

        const totalTime = Date.now() - startTime;
        const message = renameOnly
          ? `Rename only\nTime: ${(totalTime / 1000).toFixed(2)}s | Size: ${outputSizeMB}MB`
          : isImage
          ? `Conversion: ${(conversionTime / 1000).toFixed(2)}s | Total: ${(totalTime / 1000).toFixed(2)}s | Size: ${outputSizeMB}MB`
          : `Conversion: ${(conversionTime / 1000).toFixed(2)}s | Total: ${(totalTime / 1000).toFixed(2)}s | Size: ${outputSizeMB}MB`;

        console.log(`[GIF] Successfully sent GIF to user. Total time: ${(totalTime / 1000).toFixed(2)}s`);

        await this.sendResponse(interaction, {
          content: message,
          files: [attachment_out]
        });
      } finally {
        // If this is a batch conversion (context menu), defer cleanup for later
        // Otherwise, clean up immediately
        if (interaction._isBatchConversion) {
          if (!global.deferredTempDirs) {
            global.deferredTempDirs = [];
          }
          global.deferredTempDirs.push(tempDir);
        } else {
          this.cleanupTempDir(tempDir);
        }
      }
    } catch (error) {
      console.error('Error in gif command:', error);
      await this.sendErrorResponse(
        interaction,
        `Conversion failed: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Detect media type from a URL by checking headers and extension
   * @param {string} url - The URL to check
   * @returns {Object} - Object with isValid, type, extension, contentType, filename
   */
  async detectMediaType(url) {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.bmp', '.webp'];
      const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm'];
      const validImageTypes = ['image/png', 'image/jpeg', 'image/bmp', 'image/webp'];
      const validVideoTypes = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv', 'video/webm'];

      const request = protocol.get(url, { method: 'HEAD' }, (response) => {
        const contentType = response.headers['content-type'] || '';
        const contentLength = response.headers['content-length'] || 0;
        const urlPath = new URL(url).pathname;
        const extFromUrl = path.extname(urlPath).toLowerCase();

        // Try to determine type from content-type header
        const isImage = validImageTypes.some(type => contentType.startsWith(type));
        const isVideo = validVideoTypes.some(type => contentType.startsWith(type));

        // Fallback to URL extension
        const isValidExt = [...imageExtensions, ...videoExtensions].includes(extFromUrl);

        if ((isImage || isVideo) && isValidExt) {
          const filename = path.basename(urlPath) || 'media' + (extFromUrl || '.bin');
          const type = isImage ? 'image' : 'video';
          resolve({
            isValid: true,
            type: type,
            extension: extFromUrl || (isImage ? '.jpg' : '.mp4'),
            contentType: contentType.split(';')[0],
            filename: filename,
            size: parseInt(contentLength)
          });
        } else if (isValidExt) {
          // Trust the URL extension if we can't determine from headers
          const isImageByExt = imageExtensions.includes(extFromUrl);
          const filename = path.basename(urlPath) || 'media' + extFromUrl;
          resolve({
            isValid: true,
            type: isImageByExt ? 'image' : 'video',
            extension: extFromUrl,
            contentType: contentType.split(';')[0],
            filename: filename,
            size: parseInt(contentLength)
          });
        } else {
          resolve({
            isValid: false,
            type: null,
            extension: null,
            contentType: contentType,
            filename: null
          });
        }

        response.resume();
      }).on('error', () => {
        resolve({
          isValid: false,
          type: null,
          extension: null,
          contentType: null,
          filename: null
        });
      });

      request.setTimeout(5000, () => {
        request.abort();
        resolve({
          isValid: false,
          type: null,
          extension: null,
          contentType: null,
          filename: null
        });
      });
    });
  }

  /**
   * Convert image or video to GIF using ffmpeg
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output GIF path
   * @param {boolean} isVideo - Whether input is a video
   */
  convertWithFFmpeg(inputPath, outputPath, isVideo) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .output(outputPath);

      if (isVideo) {
        // Video to GIF: reduce framerate, scale, optimize colors
        command = command
          .outputOptions('-vf', 'fps=24,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=none:diff_mode=rectangle')
          .outputOptions('-loop', '0');
      } else {
        // Image to GIF: scale and optimize colors
        command = command
          .outputOptions('-vf', 'scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer')
          .outputOptions('-loop', '0');
      }

      command
        .on('error', (err) => {
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .on('end', () => {
          resolve();
        })
        .run();
    });
  }

  /**
   * Download a file from a URL
   * @param {string} url - The file URL
   * @param {string} filePath - Where to save the file
   */
  downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(filePath);

      protocol.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Recursively delete a directory
   * @param {string} dirPath - The directory to delete
   */
  cleanupTempDir(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
          const filePath = path.join(dirPath, file);
          if (fs.lstatSync(filePath).isDirectory()) {
            this.cleanupTempDir(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        });
        fs.rmdirSync(dirPath);
      }
    } catch (error) {
      console.error(`Error cleaning up temp directory: ${error.message}`);
    }
  }
}

module.exports = Gif;
