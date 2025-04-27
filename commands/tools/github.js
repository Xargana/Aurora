const { EmbedBuilder } = require('discord.js');
const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class GitHub extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'github';
    this.description = 'Fetch information from GitHub';
    this.cooldown = 5; // 5 second cooldown
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const type = interaction.options.getString("type");
      const query = interaction.options.getString("query");
      
      switch (type) {
        case "user":
          await this.fetchUser(interaction, query);
          break;
        case "repo":
          await this.fetchRepo(interaction, query);
          break;
        case "org":
          await this.fetchOrg(interaction, query);
          break;
        default:
          await this.sendErrorResponse(interaction, "Invalid type specified");
          break;
      }
    } catch (error) {
      console.error("GitHub command error:", error);
      await this.sendErrorResponse(interaction, "Failed to fetch GitHub data. Please check your query and try again.");
    }
  }
  
  async fetchUser(interaction, username) {
    try {
      const response = await axios.get(`https://api.github.com/users/${username}`, {
        headers: this.getHeaders()
      });
      
      const user = response.data;
      
      const embed = new EmbedBuilder()
        .setTitle(user.name || user.login)
        .setURL(user.html_url)
        .setDescription(user.bio || "No bio provided")
        .setColor(0x2b3137)
        .setThumbnail(user.avatar_url)
        .addFields(
          { name: "Repositories", value: user.public_repos.toString(), inline: true },
          { name: "Followers", value: user.followers.toString(), inline: true },
          { name: "Following", value: user.following.toString(), inline: true },
          { name: "Location", value: user.location || "Not specified", inline: true },
          { name: "Created", value: new Date(user.created_at).toLocaleDateString(), inline: true }
        );
      
      await this.sendResponse(interaction, { embeds: [embed] });
    } catch (error) {
      if (error.response?.status === 404) {
        await this.sendErrorResponse(interaction, `User '${username}' not found on GitHub`);
      } else {
        throw error;
      }
    }
  }
  
  async fetchRepo(interaction, repoPath) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${repoPath}`, {
        headers: this.getHeaders()
      });
      
      const repo = response.data;
      
      const embed = new EmbedBuilder()
        .setTitle(repo.full_name)
        .setURL(repo.html_url)
        .setDescription(repo.description || "No description provided")
        .setColor(0x2b3137)
        .addFields(
          { name: "Stars", value: repo.stargazers_count.toString(), inline: true },
          { name: "Forks", value: repo.forks_count.toString(), inline: true },
          { name: "Issues", value: repo.open_issues_count.toString(), inline: true },
          { name: "Language", value: repo.language || "Not specified", inline: true },
          { name: "Created", value: new Date(repo.created_at).toLocaleDateString(), inline: true },
          { name: "Updated", value: new Date(repo.updated_at).toLocaleDateString(), inline: true }
        );
        
      if (repo.license) {
        embed.addFields({ name: "License", value: repo.license.name, inline: true });
      }
      
      await this.sendResponse(interaction, { embeds: [embed] });
    } catch (error) {
      if (error.response?.status === 404) {
        await this.sendErrorResponse(interaction, `Repository '${repoPath}' not found on GitHub`);
      } else {
        throw error;
      }
    }
  }
  
  async fetchOrg(interaction, orgName) {
    try {
      const response = await axios.get(`https://api.github.com/orgs/${orgName}`, {
        headers: this.getHeaders()
      });
      
      const org = response.data;
      
      const embed = new EmbedBuilder()
        .setTitle(org.name || org.login)
        .setURL(org.html_url)
        .setDescription(org.description || "No description provided")
        .setColor(0x2b3137)
        .setThumbnail(org.avatar_url)
        .addFields(
          { name: "Public Repositories", value: org.public_repos.toString(), inline: true },
          { name: "Location", value: org.location || "Not specified", inline: true },
          { name: "Created", value: new Date(org.created_at).toLocaleDateString(), inline: true }
        );
      
      await this.sendResponse(interaction, { embeds: [embed] });
    } catch (error) {
      if (error.response?.status === 404) {
        await this.sendErrorResponse(interaction, `Organization '${orgName}' not found on GitHub`);
      } else {
        throw error;
      }
    }
  }
  
  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Add token if available
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    
    return headers;
  }
}

module.exports = GitHub;
