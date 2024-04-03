import { state, nodes } from "membrane";
import { getLatestHnMentions } from "./hn";
import { getLatestTwitterMentions } from "./twitter";
import { getLatestWebmentions } from "./webmentions";

export async function emailLatestMentions() {
  const latestHnMentions = getLatestHnMentions();
  const latestTwitterMentions = getLatestTwitterMentions();
  const latestWebmentions = getLatestWebmentions();
  const lastPollDate = new Date(state.lastPollTimestamp).toDateString();

  const subject = `New mentions of ${state.query} since ${lastPollDate}`;
  const content = [
    "========== HN mentions ==========",
    latestHnMentions,
    "========== Twitter mentions ==========",
    latestTwitterMentions,
    "========== Webmentions ==========",
    latestWebmentions,
  ].join("\n\n");

  await nodes.email.send({ subject, body: content });
}
