import type { ExpoConfig } from 'expo/config';
import { withPodfile, withPodfileProperties } from 'expo/config-plugins';
import appJson from './app.json';

const WORKLETS_POD =
  "  pod 'react-native-worklets-core', :path => '../node_modules/react-native-worklets-core', :modular_headers => true";

/** VisionCamera is Swift and needs a module map from this C++ pod. */
function withWorkletsModularHeaders(config: ExpoConfig): ExpoConfig {
  return withPodfile(config, (mod) => {
    if (!mod.modResults.contents.includes('modular_headers => true')) {
      mod.modResults.contents = mod.modResults.contents.replace(
        '  use_expo_modules!\n',
        `  use_expo_modules!\n${WORKLETS_POD}\n`,
      );
    }
    return mod;
  });
}

/**
 * VisionCamera 4 and the native pose plugin still include React Native's legacy
 * bridge headers. Expo's precompiled RN framework does not export those private
 * headers, so native camera builds must compile React Native from source.
 */
function withReactNativeSourceBuild(config: ExpoConfig): ExpoConfig {
  return withPodfileProperties(config, (mod) => {
    mod.modResults['ios.buildReactNativeFromSource'] = 'true';
    mod.modResults.EXPO_USE_PRECOMPILED_MODULES = 'false';
    return mod;
  });
}

export default withWorkletsModularHeaders(withReactNativeSourceBuild(appJson.expo as ExpoConfig));
