// Modelo de voz local: o worker o carrega e a interface confere se ele já está no aparelho.
export const VOICE_MODEL = "onnx-community/whisper-tiny.en";
export const VOICE_REVISION = "2575352d61be1bf7225cf8f8b268a4678025fc58";
// Os dois pesos grandes (os demais arquivos são metadados de poucos KB).
export const VOICE_FILES = [
  "encoder_model_quantized.onnx",
  "decoder_model_merged_quantized.onnx",
] as const;
