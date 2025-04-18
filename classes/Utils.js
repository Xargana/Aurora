const axios = require('axios');
const fs = require('fs');
const path = require('path');

class Utils {
  static async fetchJson(url) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      throw error;
    }
  }
  
  static async askCody(question, model = null, streamCallback = null) {
    if (!process.env.SOURCEGRAPH_API_KEY) {
      throw new Error("SOURCEGRAPH_API_KEY is not set in environment variables");
    }
  
    if (question.length > 1999) {
      throw new Error("Input question is too long - must be 1999 characters or less");
    }
  
    try {
      // Prepare request body - only include model if specified
      const requestBody = {
        messages: [
          {
            speaker: "human",
            text: question
          }
        ],
        temperature: 0.3,
        maxTokensToSample: 2000,
        topK: 50,
        topP: 0.95
      };
      
      // Only add the model parameter if it's provided and not null
      if (model) {
        requestBody.model = model;
      }
  
      // If there's no streamCallback, we'll use the old non-streaming approach
      if (!streamCallback) {
        const response = await axios({
          method: 'post',
          url: 'https://sourcegraph.com/.api/completions/stream',
          data: requestBody,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${process.env.SOURCEGRAPH_API_KEY}`
          },
          responseType: 'text'
        });
  
        const events = response.data.split('\n\n').filter(line => line.trim() !== '');
        
        let fullCompletion = '';
        
        for (const event of events) {
          const lines = event.split('\n');
          const eventType = lines[0].replace('event: ', '');
          
          if (eventType === 'completion') {
            const dataLine = lines[1];
            if (dataLine && dataLine.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(dataLine.substring(6));
                if (jsonData.completion) {
                  fullCompletion = jsonData.completion;
                }
              } catch (e) {
                console.error('Error parsing JSON from Cody response:', e);
              }
            }
          }
        }
        
        return fullCompletion;
      } else {
        // Streaming approach
        const response = await axios({
          method: 'post',
          url: 'https://sourcegraph.com/.api/completions/stream',
          data: requestBody,
          headers: {
            'Content-Type': 'application/json', 
            'Accept': 'text/event-stream',
            'Authorization': `token ${process.env.SOURCEGRAPH_API_KEY}`
          },
          responseType: 'stream'
        });
  
        return new Promise((resolve, reject) => {
          let fullCompletion = '';
          let buffer = '';
          
          response.data.on('data', chunk => {
            buffer += chunk.toString();
            
            // Process any complete events in the buffer
            while (buffer.includes('\n\n')) {
              const eventEndIndex = buffer.indexOf('\n\n');
              const eventString = buffer.substring(0, eventEndIndex);
              buffer = buffer.substring(eventEndIndex + 2);
              
              // Process the event
              const lines = eventString.split('\n');
              const eventType = lines[0].replace('event: ', '');
              
              if (eventType === 'completion') {
                const dataLine = lines[1];
                if (dataLine && dataLine.startsWith('data: ')) {
                  try {
                    const jsonData = JSON.parse(dataLine.substring(6));
                    if (jsonData.completion) {
                      // Append the new incremental completion
                      fullCompletion = jsonData.completion;
                      // Call the callback with the updated full completion
                      streamCallback(fullCompletion);
                    }
                  } catch (e) {
                    console.error('Error parsing JSON from Cody response:', e);
                  }
                }
              } else if (eventType === 'error') {
                const dataLine = lines[1];
                if (dataLine && dataLine.startsWith('data: ')) {
                  try {
                    const jsonData = JSON.parse(dataLine.substring(6));
                    reject(new Error(jsonData.error || 'Unknown error from Cody API'));
                  } catch (e) {
                    reject(new Error('Unknown error from Cody API'));
                  }
                }
              } else if (eventType === 'done') {
                resolve(fullCompletion);
              }
            }
          });
          
          response.data.on('error', err => {
            reject(err);
          });
        });
      }
    } catch (error) {
      console.error('Error calling Cody API:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }
  
  
  static getTempFilePath(filename) {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return path.join(tempDir, filename);
  }
  
  static formatTimestamp(timestamp) {
    return `<t:${Math.floor(timestamp / 1000)}:F>`;
  }
  
  static formatRelativeTime(timestamp) {
    return `<t:${Math.floor(timestamp / 1000)}:R>`;
  }
  
  static async downloadFile(url, filePath) {
    const writer = fs.createWriteStream(filePath);
    
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });
      
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      writer.close();
      fs.unlinkSync(filePath);
      throw error;
    }
  }
  
  static getRandomString(length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static truncateString(str, maxLength = 1000) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
  
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

module.exports = Utils;
