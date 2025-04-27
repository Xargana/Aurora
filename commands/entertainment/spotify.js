const { EmbedBuilder } = require('discord.js');
const CommandBase = require('../../classes/CommandBase');
const axios = require('axios');

class Spotify extends CommandBase {
  constructor(client) {
    super(client);
    this.name = 'spotify';
    this.description = 'Search for music on Spotify';
    this.cooldown = 5; // 5 second cooldown
    this.tokenExpiry = 0;
    this.accessToken = null;
  }
  
  async execute(interaction) {
    try {
      await this.deferReply(interaction);
      const query = interaction.options.getString("query");
      const type = interaction.options.getString("type") || "track";
      
      // Get access token if needed
      await this.ensureToken();
      
      // Search for content
      const searchResponse = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      const typeKey = `${type}s`; // e.g., "tracks", "artists"
      if (!searchResponse.data[typeKey] || searchResponse.data[typeKey].items.length === 0) {
        await this.sendErrorResponse(interaction, `No ${type}s found matching "${query}"`);
        return;
      }
      
      // Handle different content types
      switch (type) {
        case 'track':
          await this.handleTrack(interaction, searchResponse.data[typeKey].items[0]);
          break;
        case 'album':
          await this.handleAlbum(interaction, searchResponse.data[typeKey].items[0]);
          break;
        case 'artist':
          await this.handleArtist(interaction, searchResponse.data[typeKey].items[0]);
          break;
        case 'playlist':
          await this.handlePlaylist(interaction, searchResponse.data[typeKey].items[0]);
          break;
      }
    } catch (error) {
      console.error("Spotify command error:", error);
      await this.sendErrorResponse(interaction, "Failed to fetch Spotify data. Please try again later.");
    }
  }
  
  async handleTrack(interaction, track) {
    const embed = new EmbedBuilder()
      .setTitle(track.name)
      .setURL(track.external_urls.spotify)
      .setColor(0x1DB954)
      .setThumbnail(track.album.images[0]?.url)
      .addFields(
        { name: "Artist", value: track.artists.map(a => a.name).join(", "), inline: true },
        { name: "Album", value: track.album.name, inline: true },
        { name: "Release Date", value: track.album.release_date, inline: true },
        { name: "Duration", value: this.formatDuration(track.duration_ms), inline: true },
        { name: "Popularity", value: `${track.popularity}/100`, inline: true }
      );
    
    await this.sendResponse(interaction, { embeds: [embed] });
  }
  
  async handleAlbum(interaction, album) {
    const embed = new EmbedBuilder()
      .setTitle(album.name)
      .setURL(album.external_urls.spotify)
      .setColor(0x1DB954)
      .setThumbnail(album.images[0]?.url)
      .addFields(
        { name: "Artist", value: album.artists.map(a => a.name).join(", "), inline: true },
        { name: "Release Date", value: album.release_date, inline: true },
        { name: "Tracks", value: album.total_tracks.toString(), inline: true },
        { name: "Album Type", value: album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1), inline: true }
      );
    
    await this.sendResponse(interaction, { embeds: [embed] });
  }
  
  async handleArtist(interaction, artist) {
    // Get additional artist details
    const artistDetails = await axios.get(
      `https://api.spotify.com/v1/artists/${artist.id}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );
    
    const data = artistDetails.data;
    
    const embed = new EmbedBuilder()
      .setTitle(artist.name)
      .setURL(artist.external_urls.spotify)
      .setColor(0x1DB954)
      .setThumbnail(artist.images[0]?.url)
      .addFields(
        { name: "Followers", value: data.followers.total.toLocaleString(), inline: true },
        { name: "Popularity", value: `${data.popularity}/100`, inline: true },
        { name: "Genres", value: data.genres.length > 0 ? data.genres.join(", ") : "Not specified", inline: false }
      );
    
    await this.sendResponse(interaction, { embeds: [embed] });
  }
  
  async handlePlaylist(interaction, playlist) {
    const embed = new EmbedBuilder()
      .setTitle(playlist.name)
      .setURL(playlist.external_urls.spotify)
      .setColor(0x1DB954)
      .setThumbnail(playlist.images[0]?.url)
      .setDescription(playlist.description || "No description")
      .addFields(
        { name: "Owner", value: playlist.owner.display_name, inline: true },
        { name: "Tracks", value: playlist.tracks.total.toString(), inline: true },
        { name: "Public", value: playlist.public ? "Yes" : "No", inline: true }
      );
    
    await this.sendResponse(interaction, { embeds: [embed] });
  }
  
  async ensureToken() {
    const now = Date.now();
    
    // If token is still valid, return
    if (this.accessToken && now < this.tokenExpiry) {
      return;
    }
    
    // Otherwise get a new token
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'client_credentials'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      this.tokenExpiry = now + (response.data.expires_in * 1000);
    } catch (error) {
      console.error("Error getting Spotify token:", error);
      throw new Error("Failed to authenticate with Spotify API");
    }
  }
  
  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
}

module.exports = Spotify;
