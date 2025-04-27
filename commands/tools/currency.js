const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class Currency extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'currency';
    this.description = 'Convert between currencies using real-time exchange rates';
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const amount = interaction.options.getNumber("amount");
      const fromCurrency = interaction.options.getString("from").toUpperCase();
      const toCurrency = interaction.options.getString("to").toUpperCase();
      
      // Validate amount
      if (amount <= 0) {
        await this.sendErrorResponse(interaction, "Please provide a positive amount to convert.");
        return;
      }
      
      // Fetch exchange rates using the new API endpoint
      const apiUrl = `https://xargana.tr:2589/exchange-rate/convert/${fromCurrency}/${toCurrency}/${amount}`;
      const response = await axios.get(apiUrl);
      
      // Check if the request was successful
      if (response.data.result !== 'success') {
        await this.sendErrorResponse(interaction, 
          `Error: ${response.data.error || "Invalid request"}. Please check your currency codes.`
        );
        return;
      }
      
      // Get the conversion data
      const { convertedAmount, rate, lastUpdated, nextUpdate } = response.data;
      
      // Format numbers with proper separators and decimals
      const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 4 
        }).format(num);
      };
      
      // Get currency information to display symbols
      const currencyInfo = {
        USD: { symbol: '$', name: 'US Dollar' },
        EUR: { symbol: '€', name: 'Euro' },
        GBP: { symbol: '£', name: 'British Pound' },
        JPY: { symbol: '¥', name: 'Japanese Yen' },
        TRY: { symbol: '₺', name: 'Turkish Lira' },
        SEK: { symbol: 'kr', name: 'Swedish Krona' },
        INR: { symbol: '₹', name: 'Indian Rupee' },
        BRL: { symbol: 'R$', name: 'Brazilian Real' },
        CNY: { symbol: '¥', name: 'Chinese Yuan' },
        RUB: { symbol: '₽', name: 'Russian Ruble' },
        PLN: { symbol: 'zł', name: 'Polish Złoty' },
        // Add more currencies as needed
      };
      
      const fromCurrencyInfo = currencyInfo[fromCurrency] || { symbol: '', name: fromCurrency };
      const toCurrencyInfo = currencyInfo[toCurrency] || { symbol: '', name: toCurrency };
      
      // Format dates
      const lastUpdatedDate = new Date(lastUpdated);
      const nextUpdateDate = new Date(nextUpdate);
      
      // Create a rich embed
      const conversionEmbed = {
        title: "Currency Conversion",
        color: 0x4CAF50, // Green
        fields: [
          {
            name: "From",
            value: `${fromCurrencyInfo.symbol} ${formatNumber(amount)} ${fromCurrency} (${fromCurrencyInfo.name})`,
            inline: false
          },
          {
            name: "To",
            value: `${toCurrencyInfo.symbol} ${formatNumber(convertedAmount)} ${toCurrency} (${toCurrencyInfo.name})`,
            inline: false
          },
          {
            name: "Exchange Rate",
            value: `1 ${fromCurrency} = ${formatNumber(rate)} ${toCurrency}`,
            inline: true
          },
          {
            name: "Last Updated",
            value: lastUpdatedDate.toLocaleString(),
            inline: true
          },
          {
            name: "Next Update",
            value: nextUpdateDate.toLocaleString(),
            inline: true
          }
        ],
        footer: {
          text: "Powered by xargana.tr Exchange Rate API"
        },
        timestamp: new Date()
      };
      
      await this.sendResponse(interaction, { embeds: [conversionEmbed] });
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.error || "Error fetching exchange rates. Please try again later.";
      await this.sendErrorResponse(interaction, errorMessage);
    }
  }
}

module.exports = Currency;
