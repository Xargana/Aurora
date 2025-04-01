require("dotenv").config();
const Bot = require('./classes/Bot');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Initialize and start the bot
const bot = new Bot();
bot.start().catch(error => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Bot is shutting down...');
  
  // Perform any cleanup needed
  try {
    // If you have any database connections or other resources to close, do it here
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Export the bot instance for potential external use
module.exports = bot;
