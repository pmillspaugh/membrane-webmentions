# Membrane webmentions

This membrane program listens for mentions of a keyword (that you configure) on Twitter, Hacker News, and via webmentions.io and emails you new mentions every day.

The program does four core things:

1. Listens for webhooks from webmentions.io via a Membrane HTTP endpoint
2. Polls Twitter for mentions via a Membrane cron timer
3. Polls Hacker News for mentions (also on cron)
4. Emails new mentions via the Membrane email driver (also on cron)

All mentions are persisted automatically via [Membrane's durable program state](https://www.membrane.io/durable-programs), and you can inspect every event in your program with [Membrane's observability](https://www.membrane.io/observability).

Feel free to fork and remix for your own use case! For example, you may want to send yourself a Discord message using the [Membrane `discord` driver](https://github.com/membrane-io/membrane-driver-discord/tree/bf71f9f3387c58753741c80b30d4368c31e7ceda) instead of emailing. Or you might want to adjust the cron frequency down to once per week (or up to once per hour).
