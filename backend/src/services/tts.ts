import textToSpeech from "@google-cloud/text-to-speech";
import { assertGoogleCredentials } from "./googleCredentials";

function createClient() {
  return new textToSpeech.TextToSpeechClient();
}

let client: ReturnType<typeof createClient> | undefined;

const VOICES: Record<string, string> = {
  "en-IN": "en-IN-Neural2-A",
  "hi-IN": "hi-IN-Wavenet-A",
  "bn-IN": "bn-IN-Wavenet-A",
  "mr-IN": "mr-IN-Wavenet-A",
  "ta-IN": "ta-IN-Wavenet-A",
  "te-IN": "te-IN-Wavenet-A",
  "kn-IN": "kn-IN-Wavenet-A",
  "gu-IN": "gu-IN-Wavenet-A",
};

export async function generateSpeech(
  text: string,
  languageCode: string
) {
  assertGoogleCredentials();
  client ??= createClient();

  const voiceName =
    VOICES[languageCode] || VOICES["en-IN"];

  const [response] = await client.synthesizeSpeech({
    input: {
      text,
    },

    voice: {
      languageCode,
      name: voiceName,
    },

    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.92,
      pitch: 0,
    },
  });

  return response.audioContent;
}