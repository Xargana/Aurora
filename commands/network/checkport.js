const CommandBase = require('../../classes/CommandBase');
const net = require('net');

class CheckPort extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'checkport';
    this.description = 'Check if specific ports are open on a domain';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const target = interaction.options.getString("target");
      const ports = interaction.options.getString("ports").split(",").map(p => parseInt(p.trim()));

      const checkPort = (port) => {
        return new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(2000); // 2 second timeout
          
          socket.on('connect', () => {
            socket.destroy();
            resolve({ port, status: 'open' });
          });
          
          socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, status: 'closed' });
          });
          
          socket.on('error', () => {
            socket.destroy();
            resolve({ port, status: 'closed' });
          });
          
          socket.connect(port, target);
        });
      };

      const results = await Promise.all(ports.map(port => checkPort(port)));
      
      const scanEmbed = {
        title: `Port Scan Results for ${target}`,
        color: 0x00ff00,
        fields: results.map(result => ({
          name: `Port ${result.port}`,
          value: result.status === 'open' ? '🟢 Open' : '🔴 Closed',
          inline: true
        })),
        timestamp: new Date(),
        footer: { text: "Port Check" }
      };
      
      await this.sendResponse(interaction, { embeds: [scanEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to perform port scan. Please check the target and port numbers.");
    }
  }
}

module.exports = CheckPort;
