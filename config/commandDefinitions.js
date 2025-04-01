const { ApplicationCommandOptionType, ApplicationCommandType } = require("discord.js");

// Commands that should work in DMs (registered globally)
const globalCommands = [
  {
    name: "fetch_data",
    description: "Fetches data from an API",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1], // Add integration type for global availability
    contexts: [0, 1, 2],    // Available in all contexts (DM, GROUP_DM, GUILD)
    options: [
      {
        name: "url",
        description: "The URL to fetch data from",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "ping",
    description: "Pings a remote server.",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "ip",
        description: "The IP Adress to ping.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "server_status",
    description: "Fetches data from an API",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "raw",
        description: "Display raw JSON data",
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
    ],
  },
  {
    name: "cody",
    description: "Ask Cody (Sourcegraph AI) a coding question",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "question",
        description: "Your coding question",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
  },
  {
    name: "weather",
    description: "Get current weather for a location",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "location",
        description: "City name or postal code",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "mcstatus",
    description: "Check the status of a Minecraft server",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "server",
        description: "Server address (e.g., mc.hypixel.net)",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "bedrock",
        description: "Is this a Bedrock server? (Default: false)",
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      },
    ],
  },
  {
    name: "animal",
    description: "Get a random animal image",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "type",
        description: "Type of animal",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "Dog", value: "dog" },
          { name: "Cat", value: "cat" },
          { name: "Panda", value: "panda" },
          { name: "Fox", value: "fox" },
          { name: "Bird", value: "bird" },
          { name: "Koala", value: "koala" },
          { name: "Red Panda", value: "red_panda" },
          { name: "Raccoon", value: "raccoon" },
          { name: "Kangaroo", value: "kangaroo" }
        ]
      },
    ],
  },
  {
    name: "anime",
    description: "Get anime-related content",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "type",
        description: "Type of anime content",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "Wink", value: "wink" },
          { name: "Pat", value: "pat" },
          { name: "Hug", value: "hug" },
          { name: "Face Palm", value: "face-palm" },
          { name: "Quote", value: "quote" }
        ]
      },
    ],
  },
  {
    name: "checkdns",
    description: "Check if a domain is blocked by running it through a DNS server",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "domain",
        description: "Domain name to check (e.g. example.com)",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "provider",
        description: "DNS provider to use",
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: "Cloudflare (1.1.1.1)", value: "1.1.1.1" },
          { name: "Google (8.8.8.8)", value: "8.8.8.8" },
          { name: "OpenDNS", value: "208.67.222.222" },
          { name: "Quad9", value: "9.9.9.9" },
          { name: "AdGuard", value: "94.140.14.14" },
          { name: "Turknet", value: "193.192.98.8" },
          { name: "TTnet", value: "195.175.39.49" },
          { name: "Turkcell", value: "195.175.39.49" },
          { name: "Superonline", value: "195.114.66.100" }
        ]
      }
    ]
  },
  {
    name: "traceroute",
    description: "Show network path to a destination",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "target",
        description: "IP address or domain to trace (might take a long time to complete)",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "hops",
        description: "Maximum number of hops (default: 30)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
        min_value: 1,
        max_value: 32
      }
    ]
  },
  {
    name: "whois",
    description: "Get domain registration information",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "domain",
        description: "Domain to lookup (e.g. example.com)",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ]
  },
  {
    name: "stats",
    description: "Show bot and server statistics",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2]
  },
  {
    name: "checkport",
    description: "Check if specific ports are open on a domain",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "target",
        description: "Domain or IP to scan",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "ports",
        description: "Ports to scan (comma separated, e.g. 80,443,3306)",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ]
  },
  {
    name: "wikipedia",
    description: "Get a summary of a Wikipedia article",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "query",
        description: "The topic to search for on Wikipedia",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "language",
        description: "Wikipedia language (default: en)",
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: "English", value: "en" },
          { name: "Spanish", value: "es" },
          { name: "French", value: "fr" },
          { name: "German", value: "de" },
          { name: "Russian", value: "ru" },
          { name: "Japanese", value: "ja" },
          { name: "Chinese", value: "zh" },
          { name: "Turkish", value: "tr" }
        ]
      }
    ],
  },
  {
    name: "urban",
    description: "Look up a term on Urban Dictionary",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    nsfw: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "term",
        description: "The slang term to look up",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "random",
        description: "Get a random definition instead",
        type: ApplicationCommandOptionType.Boolean,
        required: false
      }
    ],
  },
  {
    name: "currency",
    description: "Convert between currencies using real-time exchange rates",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "amount",
        description: "Amount to convert",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: "from",
        description: "Source currency code (e.g., USD)",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "to",
        description: "Target currency code (e.g., EUR)",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
  },
  {
    name: "hash",
    description: "Generate hash of text or file (up to 500MB)",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "algorithm",
        description: "Hash algorithm to use",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "MD5", value: "md5" },
          { name: "SHA-1", value: "sha1" },
          { name: "SHA-256", value: "sha256" },
          { name: "SHA-512", value: "sha512" },
          { name: "SHA3-256", value: "sha3-256" },
          { name: "SHA3-512", value: "sha3-512" }
        ]
      },
      {
        name: "text",
        description: "Text to hash (if not uploading a file)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "file",
        description: "File to hash (up to 500MB)",
        type: ApplicationCommandOptionType.Attachment,
        required: false,
      }
    ],
  },
  {
    name: "info",
    description: "Display information about the bot",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2]
  },
  // Add this to the globalCommands array in commandDefinitions.js
  {
    name: "binary",
    description: "Translate between text and binary",
    type: ApplicationCommandType.ChatInput,
    dm_permission: true,
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
    {
      name: "text",
      description: "Text to convert to/from binary",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "mode",
      description: "Conversion mode",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "Text to Binary", value: "encode" },
        { name: "Binary to Text", value: "decode" }
      ]
    }
  ]
},
];

// guild commands (only available in guilds)
const guildCommands = [
];

// User context menu commands (should also be registered globally)
// user > apps > {command}
const userCommands = [
  {
    name: "User Info",
    type: ApplicationCommandType.User,
    integration_types: [1],
    contexts: [0, 1, 2],
  },
];

module.exports = {
  globalCommands,
  guildCommands,
  userCommands
};
