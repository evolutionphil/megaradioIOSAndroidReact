// Expo Config Plugin for AirPlay support
// Adds required iOS configurations for react-airplay library

const { withInfoPlist, withXcodeProject } = require('@expo/config-plugins');

const withAirPlay = (config) => {
  // Add required Info.plist entries for AirPlay
  config = withInfoPlist(config, (config) => {
    // Enable background audio modes (already should be set, but ensure)
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    
    const backgroundModes = config.modResults.UIBackgroundModes;
    
    // Add audio mode if not present
    if (!backgroundModes.includes('audio')) {
      backgroundModes.push('audio');
    }
    
    // Add external-accessory for AirPlay accessories (optional)
    if (!backgroundModes.includes('external-accessory')) {
      backgroundModes.push('external-accessory');
    }
    
    // Add Bonjour services for AirPlay discovery
    if (!config.modResults.NSBonjourServices) {
      config.modResults.NSBonjourServices = [];
    }
    
    const bonjourServices = config.modResults.NSBonjourServices;
    
    // AirPlay uses these Bonjour services
    const airplayServices = [
      '_airplay._tcp',
      '_raop._tcp', // Remote Audio Output Protocol
    ];
    
    airplayServices.forEach(service => {
      if (!bonjourServices.includes(service)) {
        bonjourServices.push(service);
      }
    });
    
    console.log('[withAirPlay] Added AirPlay Bonjour services:', airplayServices);
    
    return config;
  });
  
  return config;
};

module.exports = withAirPlay;
