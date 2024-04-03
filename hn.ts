import { state } from "membrane";

state.hnMentions ??= [];

export type HnMentions = Record<number, HnMention[]>;

interface HnMention {
  id: string;
  postedAt: Date;
  hnUrl: string;
  author: string;
  title?: string; // populated for a post
  url?: string; // populated for a post
  comment_text?: string; // populated for a comment
}

export function getLatestHnMentions() {
  const mentionsSinceLastPoll = state.hnMentions[state.hnMentions.length - 1];
  const [timestamp, mentions] = Object.entries(mentionsSinceLastPoll)[0];
  if (Number(timestamp) < state.lastPollTimestamp) {
    return "No new HN mentions.";
  }

  const formattedMentions = mentions.map((mention) => {
    const { title, comment_text, author, url, hnUrl, postedAt } = mention;
    const heading = title ? `${title} (${url})` : comment_text;
    const date = postedAt.toDateString();
    return [heading, author, hnUrl, date].join("\n");
  });

  return formattedMentions.join("\n\n");
}

export async function searchHn() {
  const HN_SEARCH_API_URL = "http://hn.algolia.com/api/v1/search";
  const params = new URLSearchParams();
  params.set("query", state.query);
  params.set("numericFilters", `created_at_i>${state.lastPollTimestamp}`);

  const res = await fetch(`${HN_SEARCH_API_URL}?${params.toString()}`);
  const { hits } = await res.json();
  if (!hits.length) return;

  const hnMentions: HnMention[] = hits.map((hit) => {
    const { title, comment_text, author, url, objectID, created_at_i } = hit;
    const hnUrl = `https://news.ycombinator.com/item?id=${objectID}`;
    const postedAt = new Date(created_at_i * 1000);
    return { title, comment_text, author, url, hnUrl, postedAt, id: objectID };
  });

  const now = Date.now();
  state.hnMentions.push({ [now]: hnMentions });
}
