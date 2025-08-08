import { Creativity } from "./lib/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";
import { CommandAnswer } from "./lib/settings/enum";

export default function Command(): JSX.Element {
  return <AnswerView command={CommandAnswer.CODE_EXPLAIN} creativity={Creativity.Low} />;
}
