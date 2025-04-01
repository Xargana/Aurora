const CommandBase = require('../../classes/CommandBase');
const { spawn } = require('child_process');

class Traceroute extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'traceroute';
    this.description = 'Show network path to a destination';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const target = interaction.options.getString("target");
      const maxHops = interaction.options.getInteger("hops") || 16;
      
      // Use shell option to properly handle the pipe
      const tracepath = spawn('traceroute -q 1 -d -m ' + maxHops + ' ' + target + ' | awk \'{print $1, $2, $3}\'', {
        shell: true
      });
      
      let output = '';
      
      tracepath.stdout.on('data', async (data) => {
        const newData = data.toString()
            .split('\n')
            .map(line => line.trim())
            .join('\n');
                
        output += newData;
        const traceEmbed = {
          title: `Path to ${target}`,
          description: `\`\`\`\n${output}\`\`\``,
          color: 0x3498db,
          timestamp: new Date(),
          footer: { text: "Tracing..." }
        };
        
        await this.sendResponse(interaction, { embeds: [traceEmbed] });
      });
    
      tracepath.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });
    
      tracepath.on('close', async () => {
        const finalEmbed = {
          title: `Path to ${target} - Complete`,
          description: `\`\`\`\n${output}\`\`\``,
          color: 0x00ff00,
          timestamp: new Date(),
          footer: { text: "✅ Trace complete" }
        };
        
        await this.sendResponse(interaction, { embeds: [finalEmbed] });
      });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to trace path. Please check the target and try again.");
    }
  }
}

module.exports = Traceroute;
