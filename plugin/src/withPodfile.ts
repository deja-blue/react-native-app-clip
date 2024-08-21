import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";
import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import fs from "fs";
import path from "path";

export const withPodfile: ConfigPlugin<{
  targetName: string;
  excludedPackages?: string[];
}> = (config, { targetName, excludedPackages }) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podFilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfileContent = fs.readFileSync(podFilePath).toString();

      // TODO(Delphine) re-use this maybe
      const useExpoModules =
        excludedPackages && excludedPackages.length > 0
          ? `exclude = ["${excludedPackages.join(`", "`)}"]
      use_expo_modules!(exclude: exclude)`
          : `use_expo_modules!`;

      const appClipTarget = `
        # All the pods we dont want - TODO(Delphine) read that in config
        appClipExcludedNativeModules = ["react-native-keyboard-controller", "intercom-react-native", "Intercom", "meksiabdou-react-native-barcode-mask", "RNInAppBrowser", "StytchReactNativeModule", "VisionCamera", "react-native-context-menu-view", "Sentry", "RNCAsyncStorage", "RNGestureHandler", "RNReanimated", "RNSVG", "RNScreens", "react-native-netinfo", "react-native-safe-area-context", "react-native-webview"]
        # Just the names in package.json !! - TODO(Delphine) read that in config
        appClipExcludedExpoModules = ["expo-updates"]

        target '${targetName}' do
          use_expo_modules!({ exclude: appClipExcludedExpoModules })
          # You need a patch of React Native for this to work
          config = use_native_modules!(packages_to_skip: appClipExcludedNativeModules)

          # Flags change depending on the env values.
          flags = get_default_flags()

          use_react_native!(
            :path => config[:reactNativePath],
            :hermes_enabled => false,
            :fabric_enabled => flags[:fabric_enabled],
            # An absolute path to your application root.
            :app_path => "#{Pod::Config.instance.installation_root}/..",
            # Note that if you have use_frameworks! enabled, Flipper will not work if enabled
            :flipper_configuration => flipper_config
          )
        end
      `;

      /* podfileContent = podfileContent
        .concat(`\n\n# >>> Inserted by react-native-app-clip`)
        .concat(podfileInsert)
        .concat(`\n\n# <<< Inserted by react-native-app-clip`); */

      podfileContent = mergeContents({
        tag: "react-native-app-clip-2",
        src: podfileContent,
        newSrc: appClipTarget,
        anchor: `Pod::UI.warn e`,
        offset: 5,
        comment: "#",
      }).contents;

      fs.writeFileSync(podFilePath, podfileContent);

      return config;
    },
  ]);
};

/*
  The patch you need to apply to React Native is the following:
  
  diff --git a/node_modules/@react-native-community/cli-platform-ios/native_modules.rb b/node_modules/@react-native-community/cli-platform-ios/native_modules.rb
index 82f537c..5f848ba 100644
--- a/node_modules/@react-native-community/cli-platform-ios/native_modules.rb
+++ b/node_modules/@react-native-community/cli-platform-ios/native_modules.rb
@@ -12,7 +12,8 @@
 require 'pathname'
 require 'cocoapods'
 
-def use_native_modules!(config = nil)
+# Patch DejaBlue - thanks Eigen for the example https://github.com/artsy/eigen/blob/da80d0d26eec7e77ef786ca6cffbe08c11e0ee99/patches/%40react-native-community%2Bcli-platform-ios%2B11.4.1.patch#L9
+def use_native_modules!(config = nil, packages_to_skip: [])
   if (config.is_a? String)
     Pod::UI.warn("Passing custom root to use_native_modules! is deprecated.",
       [
@@ -44,6 +45,10 @@ def use_native_modules!(config = nil)
 
   packages.each do |package_name, package|
     next unless package_config = package["platforms"]["ios"]
+    if skipped_pod = packages_to_skip.find { |pod_name| package["platforms"]["ios"]["podspecPath"].include? "#{pod_name}.podspec" }
+     Pod::UI.warn "Skipping pod: #{skipped_pod} for target `#{current_target_definition.name}`"      
+     next
+    end
 
     podspec_path = package_config["podspecPath"]
     configurations = package_config["configurations"]

 */
