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
      
      // Check if API key is configured
      if (!process.env.EXCHANGE_RATE_API_KEY) {
        await this.sendErrorResponse(interaction, 
          "Exchange Rate API key not configured. Please add EXCHANGE_RATE_API_KEY to your environment variables."
        );
        return;
      }
      
      // Validate amount
      if (amount <= 0) {
        await this.sendErrorResponse(interaction, "Please provide a positive amount to convert.");
        return;
      }
      
      // Fetch exchange rates
      const apiUrl = `https://blahaj.tr:2589/exchange-rate/convert/${fromCurrency}`;
      const response = await axios.get(apiUrl);
      
      // Check if the source currency is valid
      if (response.data.result === "error") {
        await this.sendErrorResponse(interaction, 
          `Error: ${response.data.error-type || "Invalid request"}. Please check your currency codes.`
        );
        return;
      }
      
      // Check if target currency exists in the response
      if (!response.data.conversion_rates[toCurrency]) {
        await this.sendErrorResponse(interaction, 
          `Could not find exchange rate for ${toCurrency}. Please check your currency code.`
        );
        return;
      }
      
      // Calculate the converted amount
      const rate = response.data.conversion_rates[toCurrency];
      const convertedAmount = amount * rate;
      
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
            value: new Date(response.data.time_last_update_unix * 1000).toLocaleString(),
            inline: true
          }
        ],
        footer: {
          text: "Powered by ExchangeRate-API"
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
