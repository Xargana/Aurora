const CommandBase = require('../../classes/CommandBase');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../gulag.txt');

class Gulag extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'gulag';
    this.description = 'Manage the gulag (blacklist)';
  }
  
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'add') {
        await this.handleAdd(interaction);
      } else if (subcommand === 'remove') {
        await this.handleRemove(interaction);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async handleAdd(interaction) {
    await this.deferReply(interaction);

    // Check if user is owner
    if (interaction.user.id !== process.env.OWNER_ID) {
      return this.sendErrorResponse(interaction, 'Only the bot owner can use this command.');
    }

    const gulagUser = interaction.options.getUser('user');
    if (!gulagUser) {
      return this.sendErrorResponse(interaction, 'Please specify a user to send to the gulag.');
    }

    // Check if user already blacklisted
    let gulagUsers = '';
    if (fs.existsSync(dbPath)) {
      gulagUsers = fs.readFileSync(dbPath, 'utf-8');
    }
    
    const userIdList = gulagUsers.split('\n').filter(id => id);
    if (userIdList.includes(gulagUser.id)) {
      return this.sendErrorResponse(interaction, 'This user is already in the gulag.');
    }
    
    gulagUsers += gulagUser.id + '\n';
    fs.writeFileSync(dbPath, gulagUsers);

    const gulagEmbed = {
      title: "Gulag Transport",
      description: `<@${gulagUser.id}> has been sent to The Gulag`,
      color: 0xff0000,
    };

    await this.sendResponse(interaction, { embeds: [gulagEmbed] });
  }

  async handleRemove(interaction) {
    await this.deferReply(interaction);

    // Check if user is owner
    if (interaction.user.id !== process.env.OWNER_ID) {
      return this.sendErrorResponse(interaction, 'Only the bot owner can use this command.');
    }

    const gulagUser = interaction.options.getUser('user');
    if (!gulagUser) {
      return this.sendErrorResponse(interaction, 'Please specify a user to remove from the gulag.');
    }

    // Check if user is blacklisted
    if (!fs.existsSync(dbPath)) {
      return this.sendErrorResponse(interaction, 'This user is not in the gulag.');
    }

    let gulagUsers = fs.readFileSync(dbPath, 'utf-8');
    const userIdList = gulagUsers.split('\n').filter(id => id);

    if (!userIdList.includes(gulagUser.id)) {
      return this.sendErrorResponse(interaction, 'This user is not in the gulag.');
    }

    // Remove user from list
    const updatedList = userIdList.filter(id => id !== gulagUser.id);
    fs.writeFileSync(dbPath, updatedList.join('\n') + (updatedList.length > 0 ? '\n' : ''));

    const releaseEmbed = {
      title: "Gulag Release",
      description: `<@${gulagUser.id}> has been released from The Gulag`,
      color: 0x00ff00,
    };

    await this.sendResponse(interaction, { embeds: [releaseEmbed] });
  }
}

module.exports = Gulag;
