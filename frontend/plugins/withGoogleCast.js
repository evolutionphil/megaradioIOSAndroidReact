// Custom Config Plugin for Google Cast - iOS additional settings
const { withInfoPlist } = require('@expo/config-plugins');

// Add Bonjour services and local network usage description for iOS
const withGoogleCastInfoPlist = (config) => {
  return withInfoPlist(config, (config) => {
    // APPEND to existing Bonjour services instead of overwriting
    const existingServices = config.modResults.NSBonjourServices || [];
    const castServices = [
      '_googlecast._tcp',
      '_94952E1F._googlecast._tcp', // MegaRadio custom receiver
    ];
    
    // Add only if not already present
    castServices.forEach(service => {
      if (!existingServices.includes(service)) {
        existingServices.push(service);
      }
    });
    
    config.modResults.NSBonjourServices = existingServices;
    
    // Local network usage description
    if (!config.modResults.NSLocalNetworkUsageDescription) {
      config.modResults.NSLocalNetworkUsageDescription = 
        'MegaRadio uses the local network to discover Cast-enabled devices on your WiFi.';
    }
    
    return config;
  });
};

module.exports = (config) => {
  config = withGoogleCastInfoPlist(config);
  return config;
};
