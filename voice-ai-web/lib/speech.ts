// 발음 듣기. 브라우저 내장 Web Speech API. 워밍업·힌트 카드에서 쓴다.

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  return (
    voices.find((v) => /Samantha|Google US English/i.test(v.name)) ??
    voices.find((v) => v.lang === "en-US") ??
    voices[0] ??
    null
  );
}

export function speak(text: string): void {
  if (typeof speechSynthesis === "undefined") return;
  if (!cachedVoice) cachedVoice = pickVoice();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  if (cachedVoice) utterance.voice = cachedVoice;
  utterance.rate = 0.85;
  speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
