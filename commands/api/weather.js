const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class Weather extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'weather';
    this.description = 'Get current weather for a location';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const location = interaction.options.getString("location");
      
      if (!process.env.WEATHER_API_KEY) {
        await this.sendErrorResponse(
          interaction, 
          "Weather API key not configured. Please add WEATHER_API_KEY to your environment variables."
        );
        return;
      }
      
      const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`;
      const response = await axios.get(weatherUrl);
      
      const data = response.data;
      const location_name = data.location.name;
      const region = data.location.region;
      const country = data.location.country;
      const temp_c = data.current.temp_c;
      const temp_f = data.current.temp_f;
      const condition = data.current.condition.text;
      const humidity = data.current.humidity;
      const wind_kph = data.current.wind_kph;
      const wind_mph = data.current.wind_mph;
      const feelslike_c = data.current.feelslike_c;
      const feelslike_f = data.current.feelslike_f;
      
      const weatherEmbed = {
        title: `Weather for ${location_name}, ${region}, ${country}`,
        description: `Current condition: ${condition}`,
        fields: [
          { name: 'Temperature', value: `${temp_c}°C / ${temp_f}°F`, inline: true },
          { name: 'Feels Like', value: `${feelslike_c}°C / ${feelslike_f}°F`, inline: true },
          { name: 'Humidity', value: `${humidity}%`, inline: true },
          { name: 'Wind Speed', value: `${wind_kph} km/h / ${wind_mph} mph`, inline: true }
        ],
        thumbnail: { url: `https:${data.current.condition.icon}` },
        timestamp: new Date(),
        footer: { text: 'Powered by WeatherAPI.com' }
      };
      
      await this.sendResponse(interaction, { embeds: [weatherEmbed] });
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(
        interaction, 
        "Failed to fetch weather data. Please check the location name and try again."
      );
    }
  }
}

module.exports = Weather;
