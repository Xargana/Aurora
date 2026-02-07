const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');
const { AttachmentBuilder } = require('discord.js');

class ServerStatus extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'status';
    this.description = 'Fetches server status data';
    this.cooldown = 5; // Set a 5 second cooldown
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const isRaw = interaction.options.getBoolean("raw") ?? false;
      const response = await axios.get("https://xargana.tr:2589/status");
      
      if (isRaw) {
        const jsonString = JSON.stringify(response.data, null, 2);
        const MAX_CONTENT_LENGTH = 1900; // Discord message limit is 2000, leave buffer
        
        if (jsonString.length > MAX_CONTENT_LENGTH) {
          // Create a text file attachment
          const attachment = new AttachmentBuilder(Buffer.from(jsonString), { name: 'status.json' });
          await this.sendResponse(interaction, {
            content: "Status data is too large, sending as file:",
            files: [attachment]
          });
        } else {
          await this.sendResponse(interaction, {
            content: `\`\`\`json\n${jsonString}\n\`\`\``
          });
        }
        return;
      }
      
      // Handle the new API format (with monitors and pm2Services)
      const monitorsData = response.data.monitors || {};
      const pm2ServicesData = response.data.pm2Services || {};
      const monitorFailureCounts = response.data.monitorFailureCounts || {};
      const pm2FailureCounts = response.data.pm2FailureCounts || {};
      
      const fields = [];
      
      // Helper function to get status emoji
      const getStatusEmoji = (status) => {
        switch(status) {
          case 'up': return "🟢";
          case 'down': return "🔴";
          case 'unknown': return "🟡";
          default: return "⚪";
        }
      };
      
      // Group monitors by parent
      const groupedMonitors = {};
      
      for (const [id, monitor] of Object.entries(monitorsData)) {
        const parentId = monitor.parentId ? monitor.parentId.toString() : "root";
        if (!groupedMonitors[parentId]) {
          groupedMonitors[parentId] = [];
        }
        groupedMonitors[parentId].push(monitor);
      }
      
      // Display monitors grouped by parent
      for (const [parentId, monitors] of Object.entries(groupedMonitors)) {
        // Add parent name as section header (only if it's a group type)
        const parentName = parentId === "root" ? "All Services" : 
          (monitorsData[parentId]?.name || `Group ${parentId}`);
        
        // Only add parent header if parent is a group type or root
        if (parentId === "root" || monitorsData[parentId]?.type === "group") {
          fields.push({
            name: parentName,
            value: "\u200B",
            inline: false
          });
        }
        
        // Display all monitors in this group as inline fields
        for (const monitor of monitors) {
          const status = `${getStatusEmoji(monitor.status)} ${monitor.status.toUpperCase()}`;
          const responseTime = monitor.responseTime ? `${monitor.responseTime}ms` : "N/A";
          const uptime = monitor.uptime24h || "N/A";
          const failureCount = monitorFailureCounts[monitor.id] || 0;
          
          let value = `Status: ${status}\nResponse Time: ${responseTime}\nUptime (24h): ${uptime}`;
          if (failureCount > 0) {
            value += `\nFailures: ${failureCount}`;
          }
          
          fields.push({
            name: `${monitor.name} (${monitor.type})`,
            value: value,
            inline: true
          });
        }
      }
      
      // Add PM2 services section if available
      if (Object.keys(pm2ServicesData).length > 0) {
        // Add a separator
        fields.push({
          name: "\u200B",
          value: "\u200B",
          inline: false
        });
        
        fields.push({
          name: "PM2 Services",
          value: "\u200B",
          inline: false
        });
        
        for (const [service, data] of Object.entries(pm2ServicesData)) {
          const status = data.status === 'online' ? "🟢 Online" : "🔴 Offline";
          const memory = data.memory ? `${(data.memory / (1024 * 1024)).toFixed(1)} MB` : "N/A";
          const cpu = data.cpu ? `${data.cpu.toFixed(1)}%` : "N/A";
          const failureCount = pm2FailureCounts[service] || 0;
          
          let value = `Status: ${status}\nCPU: ${cpu}\nMemory: ${memory}\nRestarts: ${data.restarts || 0}`;
          if (failureCount > 0) {
            value += `\nFailures: ${failureCount}`;
          }
          
          fields.push({
            name: data.name || service,
            value: value,
            inline: true
          });
        }
      }
      
      // If no data was found
      if (fields.length === 0) {
        fields.push({
          name: "No Data",
          value: "No monitor or service data available",
          inline: false
        });
      }
      
      const statusEmbed = {
        title: "System Status",
        description: "Current status of servers and services",
        color: 0x3498db,
        fields: fields,
        timestamp: new Date(),
        footer: {
          text: "Status Command"
        }
      };
      
      await this.sendResponse(interaction, { embeds: [statusEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction, "Failed to get status. The status server may be down.");
    }
  }
}

module.exports = ServerStatus;
