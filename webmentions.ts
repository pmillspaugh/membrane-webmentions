import { state, nodes } from "membrane";

state.webmentions ??= [];

export interface Webmention {
  source: string;
  target: string;
  receivedAt: string;
}

export function getLatestWebmentions() {
  const mentionsSinceLastPoll = state.webmentions.filter(
    (wm) => new Date(wm.receivedAt).getTime() > Number(state.lastPollTimestamp)
  );

  if (!mentionsSinceLastPoll.length) return "No new webmentions.";

  const formattedMentions = mentionsSinceLastPoll.map(
    ({ source, target, receivedAt }) =>
      `${source} | ${target} | ${new Date(receivedAt).toDateString()}`
  );

  return formattedMentions.join("\n\n");
}

// The body includes other properties, but these are the ones we'll use
export interface WebmentionIncomingWebhookBody {
  secret: string;
  source: string;
  target: string;
  post: {
    ["wm-received"]: string;
  };
}

export async function handleWebmentionsIncomingWebhook(
  body: WebmentionIncomingWebhookBody
) {
  const { secret, source, target, post } = body;

  if (secret !== state.webmentionsIoToken) {
    console.log("Invalid secret");
    return JSON.stringify({ status: 401 });
  }

  const timestamp = new Date(post["wm-received"]).toDateString();
  const subject = `New webmention on ${state.query}`;
  const message = `New webmention from ${source} to ${target} at ${timestamp}`;
  await nodes.email.send({ subject, body: message });
  state.webmentions.push({ source, target, receivedAt: post["wm-received"] });

  return JSON.stringify({ status: 200 });
}

export function serveWebmentionsExamplePage() {
  return JSON.stringify({
    status: 200,
    headers: { "Content-Type": "text/html" },
    body: `
      <html>
        <body>
          <h1>Webmentions test</h1>
          <p><a href="https://www.petemillspaugh.com/think-small">Think small</a></p>
          <p><a href="https://www.petemillspaugh.com/anki">Anki</a></p>
          <p><a href="https://www.petemillspaugh.com/slippery-scope">Slippery scope</a></p>
          <p><a href="https://www.petemillspaugh.com/newsletters">Newsletters</a></p>
        </body>
      </html>
    `,
  });
}

export async function sendTestWebmention() {
  const url = "https://webmention.io/www.petemillspaugh.com/webmention";
  const source = "https://yard-915-release-942-coffee-862-net.hook.membrane.io";
  const target = "https://www.petemillspaugh.com/newsletters";
  const encode = (url: string) => encodeURIComponent(url);
  const body = `source=${encode(source)}&target=${encode(target)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const status = res.status;
  const text = await res.text();
  console.log("Status:", status);
  console.log(text);
}

async function testFetchWebmentions() {
  const WEBMENTIONS_API_URL = "https://webmention.io/api/mentions.jf2";
  const url = `${WEBMENTIONS_API_URL}?domain=www.petemillspaugh.com&token=${state.webmentionsIoToken}`;
  const res = await fetch(url);
  const status = res.status;
  const text = await res.text();

  console.log("Status:", status);
  console.log(text);
}
