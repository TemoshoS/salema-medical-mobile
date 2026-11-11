module.exports = ({ config }) => {
  const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const plugins = [...(config.plugins ?? [])];

  function ensurePlugin(name) {
    if (!plugins.some((plugin) =>
      Array.isArray(plugin) ? plugin[0] === name : plugin === name
    )) {
      plugins.push(name);
    }
  }

  ensurePlugin("@livekit/react-native-expo-plugin");
  ensurePlugin("@config-plugins/react-native-webrtc");

  const mapsPluginIndex = plugins.findIndex((plugin) =>
    Array.isArray(plugin)
      ? plugin[0] === "react-native-maps"
      : plugin === "react-native-maps"
  );

  if (mapsApiKey) {
    if (mapsPluginIndex >= 0) {
      plugins[mapsPluginIndex] = [
        "react-native-maps",
        {
          ...(Array.isArray(plugins[mapsPluginIndex])
            ? plugins[mapsPluginIndex][1]
            : {}),
          androidGoogleMapsApiKey: mapsApiKey,
        },
      ];
    } else {
      plugins.push([
        "react-native-maps",
        { androidGoogleMapsApiKey: mapsApiKey },
      ]);
    }
  }

  return { ...config, plugins };
};
