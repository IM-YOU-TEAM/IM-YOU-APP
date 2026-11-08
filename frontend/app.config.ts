import type { ExpoConfig } from 'expo/config';
import { withPodfile } from 'expo/config-plugins';
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

export default withWorkletsModularHeaders(appJson.expo as ExpoConfig);
