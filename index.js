require("dotenv").config();
const Bot = require('./classes/Bot');

// Initialize the bot
const bot = new Bot();

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  
  try {
    await bot.sendShutdownNotification('Uncaught Exception', error);
    console.log('Shutdown notification sent');
  } catch (notifyError) {
    console.error('Failed to send shutdown notification:', notifyError);
  } finally {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  try {
    await bot.sendShutdownNotification('Unhandled Promise Rejection', reason);
    console.log('Shutdown notification sent');
  } catch (notifyError) {
    console.error('Failed to send shutdown notification:', notifyError);
  }
  // Not exiting here as it might be recoverable
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Bot is shutting down...');
  
  try {
    // Send notification before shutting down
    await bot.sendShutdownNotification('Manual Shutdown (SIGINT)');
    console.log('Shutdown notification sent');
    
    // If you have any database connections or other resources to close, do it here
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle SIGTERM (termination signal)
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Bot is shutting down...');
  
  try {
    await bot.sendShutdownNotification('Server Termination Signal (SIGTERM)');
    console.log('Shutdown notification sent');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the bot
bot.start().catch(async error => {
  console.error("Failed to start bot:", error);
  
  try {
    // Even though the bot failed to start, try to notify the owner via other means
    // This might not work if client isn't ready
    await bot.sendShutdownNotification('Failed to Start', error);
  } catch (notifyError) {
    console.error('Failed to send startup failure notification:', notifyError);
  }
  
  process.exit(1);
});

// Export the bot instance for potential external use
module.exports = bot;
