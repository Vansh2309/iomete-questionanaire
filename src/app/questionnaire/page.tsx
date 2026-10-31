import Questionnaire from "@/components/Questionnaire";
import sample from "@/data/sample-questionnaire.json";

export default function Page() {
  const lines: string[] = [];
  for (const s of sample.sections) {
    lines.push(`# ${s.domain}`);
    lines.push(...s.questions);
    lines.push("");
  }
  return <Questionnaire sampleText={lines.join("\n").trim()} sampleCount={sample.sections.reduce((n, s) => n + s.questions.length, 0)} />;
}
