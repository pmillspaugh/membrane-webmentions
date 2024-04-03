import { state } from "membrane";

state.twitterMentions ??= [];

export type TwitterMentions = Record<number, TwitterMention[]>;

interface TwitterMention {
  id: string;
  postedAt: Date;
  tweet: string;
  user: string;
  url: string;
  views: number;
}

export function getLatestTwitterMentions() {
  const newMentions = state.twitterMentions[state.twitterMentions.length - 1];
  const [timestamp, mentions] = Object.entries(newMentions)[0];
  if (Number(timestamp) < state.lastPollTimestamp) {
    return "No new Twitter mentions.";
  }

  const formattedMentions = mentions.map((mention) => {
    const { tweet, postedAt, user, url, views } = mention;
    const date = postedAt.toDateString();
    return [`(${date})`, tweet, user, url, `Views: ${views}`].join("\n");
  });

  return formattedMentions.join("\n\n");
}

/*
  This implementation is brittle because it uses Twitter's private GraphQL API, scraped from devtools.
  The parts most likely to break quickly are the GQL query id and auth tokens.
  Anecdotally, after one day I had to change the query id, but all tokens were the same.
*/
export async function searchTwitterPrivateApi() {
  const baseUrl = `https://twitter.com/i/api/graphql/${state.twitterPrivateApiSearchQueryId}/SearchTimeline`;
  const variables = { rawQuery: state.query, product: "Top" };
  const encodedVariables = encodeURIComponent(JSON.stringify(variables));
  const encodedFeatures = encodeURIComponent(JSON.stringify(FEATURES));
  const twitterSearchUrl = `${baseUrl}?variables=${encodedVariables}&features=${encodedFeatures}`;
  const res = await fetch(twitterSearchUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.twitterPrivateApiBearerToken}`,
      Cookie: `auth_token=${state.twitterPrivateApiAuthToken}`,
      "X-Csrf-Token": `${state.twitterPrivateApiCsrfToken}`,
    },
  });

  const { data } = await res.json();
  const rawTweets =
    data.search_by_raw_query.search_timeline.timeline.instructions[0].entries;

  const tweets: TwitterMention[] = rawTweets.map((entry) => {
    try {
      const tweetData = entry.content.itemContent.tweet_results.result;
      const tweetId = tweetData.rest_id;
      const tweet = tweetData.legacy.full_text;
      const postedAt = parseTwitterDate(tweetData.legacy.created_at);
      const user = tweetData.core.user_results.result.legacy.name;
      const handle = tweetData.core.user_results.result.legacy.screen_name;
      const url = `https://twitter.com/${handle}/status/${tweetId}`;
      const views = tweetData.views.count;

      return { id: tweetId, tweet, postedAt, user, url, views };
    } catch (error) {
      return null;
    }
  });

  const newTweets = tweets.filter((tweet) => {
    return Boolean(tweet) && tweet.postedAt.getTime() > state.lastPollTimestamp;
  });

  if (newTweets.length) {
    const now = Date.now();
    state.twitterMentions.push({ [now]: newTweets });
  }
}

/* V2 API */

// Fails because my developer account is Free, and the search v2 API is only available on Basic accounts for $100/month
export async function searchTwitterApiV2() {
  const TWITTER_SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent";
  const res = await fetch(`${TWITTER_SEARCH_URL}?query=${state.query}`, {
    headers: { Authorization: `Bearer ${state.twitterApiV2BearerToken}` },
  });

  const data = await res.json();
  console.log(JSON.stringify(data));
}

/* HELPERS */

/*
  Doing this because QuickJS runtime doesn't support creating a new Date object from the string Twitter returns
  E.g. new Date("Fri Jan 06 18:29:12 +0000 2023") works in browser but not QuickJS
*/
function parseTwitterDate(createdAt: string) {
  const [weekday, month, day, time, tz, year] = createdAt.split(" ");
  const postedAt = new Date(`${year}-${MONTH_MAP[month]}-${day}T${time}${tz}`);
  return postedAt;
}

const MONTH_MAP = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const FEATURES = {
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  rweb_tipjar_consumption_enabled: true,
};
