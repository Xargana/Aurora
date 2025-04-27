const axios = require('axios');

class MinecraftAPIUtils {
  constructor() {
    this.apiBaseUrl = "https://api.cornbread2100.com";
  }

  /**
   * Fetches server data from the Minecraft Server Scanner API
   * @param {Object} params - Query parameters for the search
   * @param {Number} limit - Maximum number of results to return
   * @param {Number} skip - Number of results to skip (for pagination)
   * @returns {Promise<Array>} Array of server objects
   */
  async fetchServers(params = {}, limit = 10, skip = 0) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add limit and skip for pagination
      queryParams.append('limit', limit);
      queryParams.append('skip', skip);
      
      // Add all other parameters
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, value);
      });
      
      const response = await axios.get(`${this.apiBaseUrl}/servers?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching Minecraft servers:", error);
      throw error;
    }
  }

  /**
   * Fetches a random online Minecraft server
   * @returns {Promise<Object>} A server object
   */
  async fetchRandomServer() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/servers?limit=1&random=true`);
      return response.data[0];
    } catch (error) {
      console.error("Error fetching random Minecraft server:", error);
      throw error;
    }
  }
  
  /**
   * Gets info for a specific server by IP and port
   * @param {String} ip - The server IP address
   * @param {Number} port - The server port
   * @returns {Promise<Object>} Server data
   */
  async getServerInfo(ip, port = 25565) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/servers?ip=${ip}&port=${port}`);
      return response.data[0];
    } catch (error) {
      console.error(`Error fetching server info for ${ip}:${port}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetches player history for a server
   * @param {String} ip - The server IP address
   * @param {Number} port - The server port
   * @returns {Promise<Array>} Array of player history objects
   */
  async getPlayerHistory(ip, port) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/playerHistory?ip=${ip}&port=${port}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching player history for ${ip}:${port}:`, error);
      throw error;
    }
  }
  
  /**
   * Gets the total count of servers matching a query
   * @param {Object} params - Query parameters
   * @returns {Promise<Number>} Count of matching servers
   */
  async getServerCount(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add all parameters
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, value);
      });
      
      const response = await axios.get(`${this.apiBaseUrl}/count?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching server count:", error);
      throw error;
    }
  }
  
  /**
   * Utility function to clean IP addresses
   * @param {Number} ip - Integer representation of IP
   * @returns {String} Formatted IP address
   */
  cleanIp(ip) {
    return [
      (ip >>> 24) & 255,
      (ip >>> 16) & 255,
      (ip >>> 8) & 255,
      ip & 255
    ].join('.');
  }
  
  /**
   * Formats the description for display
   * @param {String|Object} description - Server description
   * @returns {String} Formatted description
   */
  getDescription(description) {
    if (!description) return "No description";
    
    if (typeof description === 'object') {
      // Handle JSON description
      const text = description.text || "";
      const extra = description.extra || [];
      return text + extra.map(e => e.text || "").join("");
    }
    
    return description.toString();
  }
  
  /**
   * Format player information for display
   * @param {Object} server - Server object
   * @param {Array} playerHistory - Optional player history
   * @param {Boolean} showHistory - Whether to show history
   * @returns {String} Formatted player info
   */
  displayPlayers(server, playerHistory = null, showHistory = false) {
    if (!server.players) return "Players: Unknown";
    
    const { online, max } = server.players;
    let result = `${online || 0}/${max || 0}`;
    
    if (showHistory && playerHistory && playerHistory.length > 0) {
      result += "\n**Player History:**\n";
      const players = playerHistory.slice(0, 15);
      result += players.map(p => {
        const lastSeen = new Date(p.lastSession * 1000);
        return `${p.name} - <t:${Math.floor(p.lastSession)}:R>`;
      }).join("\n");
      
      if (playerHistory.length > 15) {
        result += `\n...and ${playerHistory.length - 15} more`;
      }
    } else if (server.players.sample && !showHistory) {
      result += "\n**Online Players:**\n";
      result += server.players.sample.map(p => p.name).join(", ");
    }
    
    return result;
  }
}

module.exports = new MinecraftAPIUtils();
