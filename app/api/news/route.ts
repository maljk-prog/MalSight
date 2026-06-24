export async function GET() {
  return Response.json({
    items: [
      {
        source: "BleepingComputer",
        title: "Sample breach story: ransomware group targets healthcare provider",
        link: "https://www.bleepingcomputer.com/",
        pubDate: "Today",
        contentSnippet:
          "Example article card for MalSight. Live RSS can be added after the layout is stable.",
        image: null,
      },
      {
        source: "The Hacker News",
        title: "Sample security story: critical vulnerability exploited in the wild",
        link: "https://thehackernews.com/",
        pubDate: "Today",
        contentSnippet:
          "This confirms the Breach News tab and card layout are working before adding live feeds.",
        image: null,
      },
    ],
  });
}