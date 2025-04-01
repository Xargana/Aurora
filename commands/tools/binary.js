const CommandBase = require('../../classes/CommandBase');

class Binary extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'binary';
    this.description = 'Translate between text and binary';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const text = interaction.options.getString("text");
      const mode = interaction.options.getString("mode") || "encode";
      
      let result;
      let inputType;
      let outputType;
      
      if (mode === "encode") {
        // Text to Binary
        result = this.textToBinary(text);
        inputType = "Text";
        outputType = "Binary";
      } else {
        // Binary to Text
        result = this.binaryToText(text);
        inputType = "Binary";
        outputType = "Text";
      }
      
      // Create a rich embed
      const binaryEmbed = {
        title: `${inputType} to ${outputType} Conversion`,
        color: 0x3498db,
        fields: [
          {
            name: `Input (${inputType})`,
            value: text.length > 1024 ? text.substring(0, 1021) + "..." : text
          },
          {
            name: `Output (${outputType})`,
            value: result.length > 1024 ? result.substring(0, 1021) + "..." : result
          }
        ],
        footer: {
          text: "Binary Translator"
        },
        timestamp: new Date()
      };
      
      await this.sendResponse(interaction, { embeds: [binaryEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Error processing binary conversion. Please check your input and try again.");
    }
  }
  
  // Convert text to binary
  textToBinary(text) {
    return text.split('').map(char => {
      const binary = char.charCodeAt(0).toString(2);
      // Pad with zeros to make 8 bits
      return '0'.repeat(8 - binary.length) + binary;
    }).join(' ');
  }
  
  // Convert binary to text
  binaryToText(binary) {
    // Remove any spaces or other non-binary characters
    const cleanBinary = binary.replace(/[^01]/g, '');
    
    // Check if the input is valid binary (only 0s and 1s)
    if (!/^[01]+$/.test(cleanBinary)) {
      throw new Error("Invalid binary input. Binary should only contain 0s and 1s.");
    }
    
    // Split into 8-bit chunks and convert
    const chunks = cleanBinary.match(/.{1,8}/g) || [];
    return chunks.map(chunk => String.fromCharCode(parseInt(chunk, 2))).join('');
  }
}

module.exports = Binary;
