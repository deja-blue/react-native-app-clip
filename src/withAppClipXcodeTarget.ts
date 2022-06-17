import { ConfigPlugin, withXcodeProject } from "@expo/config-plugins";
import * as path from "path";

import { getAppClipBundleIdentifier, getAppClipName } from "./withIosAppClip";
import { addAppClipXcodeTarget } from "./xcodeAppClip/xcodeAppClip";

export const withAppClipXcodeTarget: ConfigPlugin = (config) => {
  return withXcodeProject(config, (config) => {
    const appName = config.modRequest.projectName!;
    const appClipName = getAppClipName(config.modRequest.projectName!);
    const appClipBundleIdentifier = getAppClipBundleIdentifier(
      config.ios!.bundleIdentifier!
    );
    const appClipRootPath = path.join(
      config.modRequest.platformProjectRoot,
      appClipName
    );

    addAppClipXcodeTarget(config.modResults, {
      appName,
      appClipName,
      appClipBundleIdentifier,
      appClipRootPath,
    });

    return config;
  });
};