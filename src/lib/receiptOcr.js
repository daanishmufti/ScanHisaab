import { Platform } from "react-native";
import Constants from "expo-constants";
const SUPPORTED = Platform.OS !== "web" && Constants.executionEnvironment !== "storeClient";
let TextRecognition = null;
if (SUPPORTED) {
  try {
    TextRecognition = require("@react-native-ml-kit/text-recognition").default;
  } catch (e) {
    TextRecognition = null;
  }
}
export function isOcrSupported() {
  return !!TextRecognition;
}
export async function recognizeReceipt(uri) {
  if (!TextRecognition) {
    throw new Error("On-device scanning needs a development build (not available in Expo Go).");
  }
  const result = await TextRecognition.recognize(uri);
  return result && Array.isArray(result.blocks) ? result : {
    text: result && result.text || "",
    blocks: []
  };
}