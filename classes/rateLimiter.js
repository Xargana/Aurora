/**
 * Simple rate limiter for commands
 */
class RateLimiter {
  constructor() {
    this.cooldowns = new Map();
  }

  /**
   * Check if a user is on cooldown for a specific command
   * @param {string} userId - The user's Discord ID
   * @param {string} commandName - The command name
   * @param {number} cooldownSeconds - Cooldown duration in seconds
   * @returns {Object} - Object containing isLimited and remainingTime
   */
  isRateLimited(userId, commandName, cooldownSeconds = 2) {
    const key = `${userId}-${commandName}`;
    const now = Date.now();
    const timestamps = this.cooldowns;
    
    if (!timestamps.has(commandName)) {
      timestamps.set(commandName, new Map());
    }
    
    const userTimestamps = timestamps.get(commandName);
    const expirationTime = userTimestamps.get(key) || 0;
    
    if (now < expirationTime) {
      const remainingTime = (expirationTime - now) / 1000;
      return { 
        isLimited: true, 
        remainingTime: remainingTime.toFixed(1)
      };
    }
    
    // Set the cooldown
    userTimestamps.set(key, now + (cooldownSeconds * 1000));
    
    // Clean up old entries every 10 minutes
    setTimeout(() => userTimestamps.delete(key), cooldownSeconds * 1000);
    
    return { isLimited: false };
  }
  
  /**
   * Clear all cooldowns
   */
  clearAll() {
    this.cooldowns.clear();
  }
  
  /**
   * Clear cooldowns for a specific command
   * @param {string} commandName - The command name
   */
  clearCommand(commandName) {
    this.cooldowns.delete(commandName);
  }
  
  /**
   * Clear cooldown for a specific user and command
   * @param {string} userId - The user's Discord ID
   * @param {string} commandName - The command name
   */
  clearUser(userId, commandName) {
    if (this.cooldowns.has(commandName)) {
      const userTimestamps = this.cooldowns.get(commandName);
      const key = `${userId}-${commandName}`;
      userTimestamps.delete(key);
    }
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;
