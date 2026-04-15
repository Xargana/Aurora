const CommandBase = require('../../classes/CommandBase');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../gulag.txt');

class Blacklist extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'blacklist';
    this.description = 'Lists all blacklisted users';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      
      if (!fs.existsSync(dbPath)) {
        return this.sendErrorResponse(interaction, 'The gulag is empty.');
      }

      const userIds = fs.readFileSync(dbPath, 'utf-8').trim().split('\n').filter(id => id);

      if (userIds.length === 0) {
        return this.sendErrorResponse(interaction, 'The gulag is empty.');
      }

      const userMentions = userIds.map(id => `<@${id}>`).join('\n');

      const embed = {
        title: "The Gulag",
        description: userMentions,
        color: 0xff0000,
      };

      await this.sendResponse(interaction, { embeds: [embed] });
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = Blacklist;
