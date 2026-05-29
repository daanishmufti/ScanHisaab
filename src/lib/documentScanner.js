import { Platform } from "react-native";
import Constants from "expo-constants";
const SUPPORTED = Platform.OS !== "web" && Constants.executionEnvironment !== "storeClient";
let DocumentScanner = null;
if (SUPPORTED) {
  try {
    DocumentScanner = require("react-native-document-scanner-plugin").default;
  } catch (e) {
    DocumentScanner = null;
  }
}
export function isDocScannerSupported() {
  return !!DocumentScanner;
}
export async function scanDocuments({
  max
} = {}) {
  if (!DocumentScanner) {
    throw new Error("Document scanning needs a development build (not available in Expo Go).");
  }
  const {
    scannedImages,
    status
  } = await DocumentScanner.scanDocument({
    croppedImageQuality: 100,
    responseType: "imageFilePath",
    ...(max ? {
      maxNumDocuments: max
    } : {})
  });
  if (status === "cancel" || !Array.isArray(scannedImages)) return [];
  return scannedImages.filter(Boolean).map(u => /^(file|content):\/\//.test(u) ? u : `file://${u}`);
}