import { root, state, resolvers } from "membrane";
import {
  Webmention,
  WebmentionIncomingWebhookBody,
  handleWebmentionsIncomingWebhook,
  serveWebmentionsExamplePage,
} from "./webmentions";
import { TwitterMentions, searchTwitterPrivateApi } from "./twitter";
import { HnMentions, searchHn } from "./hn";
import { emailLatestMentions } from "./helpers";

state.lastPollTimestamp ??= Date.now();

export type State = {
  query: string;
  lastPollTimestamp: number;

  // Webmentions
  webmentions: Webmention[];
  webmentionsIoToken: string;

  // Twitter
  twitterMentions: TwitterMentions[];
  twitterApiV2BearerToken?: string;
  twitterPrivateApiBearerToken?: string;
  twitterPrivateApiAuthToken?: string;
  twitterPrivateApiCsrfToken?: string;
  twitterPrivateApiSearchQueryId?: string;

  // HN
  hnMentions: HnMentions[];
};

export const poll: resolvers.Root["poll"] = async () => {
  await searchTwitterPrivateApi();
  await searchHn();

  await emailLatestMentions();
  state.lastPollTimestamp = Date.now();
};

export const status: resolvers.Root["status"] = () => {
  const requiredState = [state.query, state.webmentionsIoToken];

  return requiredState.some((s) => !s)
    ? "[Add query and tokens](:configure)"
    : "Ready";
};

export const configure: resolvers.Root["configure"] = async ({
  query,
  webmentionsIoToken,
  twitterApiV2BearerToken,
  twitterPrivateApiBearerToken,
  twitterPrivateApiAuthToken,
  twitterPrivateApiCsrfToken,
  twitterPrivateApiSearchQueryId,
}) => {
  state.query = query;

  state.webmentionsIoToken = webmentionsIoToken; // https://webmention.io/settings

  state.twitterApiV2BearerToken =
    twitterApiV2BearerToken ?? state.twitterApiV2BearerToken;
  state.twitterPrivateApiBearerToken =
    twitterPrivateApiBearerToken ?? state.twitterPrivateApiBearerToken;
  state.twitterPrivateApiAuthToken =
    twitterPrivateApiAuthToken ?? state.twitterPrivateApiAuthToken;
  state.twitterPrivateApiCsrfToken =
    twitterPrivateApiCsrfToken ?? state.twitterPrivateApiCsrfToken;
  state.twitterPrivateApiSearchQueryId =
    twitterPrivateApiSearchQueryId ?? state.twitterPrivateApiSearchQueryId;

  root.statusChanged.$emit();
};

export const endpoint: resolvers.Root["endpoint"] = async (req) => {
  switch (req.method) {
    case "POST":
      const body = JSON.parse(req.body as any) as WebmentionIncomingWebhookBody;
      const response = await handleWebmentionsIncomingWebhook(body);
      return response;
    case "GET":
      return serveWebmentionsExamplePage();
    default:
      return JSON.stringify({
        status: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "method not allowed" }),
      });
  }
};
