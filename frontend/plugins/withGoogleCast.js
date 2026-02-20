// Custom Config Plugin for Google Cast - iOS additional settings
const { withInfoPlist } = require('@expo/config-plugins');

// Add Bonjour services and local network usage description for iOS
const withGoogleCastInfoPlist = (config) => {
  return withInfoPlist(config, (config) => {
    // Add Bonjour services for Cast device discovery
    config.modResults.NSBonjourServices = [
      '_googlecast._tcp',
      '_94952E1F._googlecast._tcp', // MegaRadio custom receiver
    ];
    
    // Local network usage description (German/Turkish friendly)
    if (!config.modResults.NSLocalNetworkUsageDescription) {
      config.modResults.NSLocalNetworkUsageDescription = 
        'MegaRadio nutzt das lokale Netzwerk, um Cast-fähige Geräte in Ihrem WLAN zu finden. / MegaRadio WiFi ağınızdaki Cast destekli cihazları bulmak için yerel ağı kullanır.';
    }
    
    return config;
  });
};

module.exports = (config) => {
  config = withGoogleCastInfoPlist(config);
  return config;
};
