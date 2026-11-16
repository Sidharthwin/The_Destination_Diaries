import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/layout/page-header";
import { listDestinations } from "@/server/services/places";

export const metadata: Metadata = { title: "About", description: "Why Destination Diaries exists, and where our data comes from." };

export default async function AboutPage() {
  const destinations = await listDestinations();
  return (
    <>
      <PageHeader
        eyebrow="About"
        title={<>Travel planning that respects the <span className="italic">traveller</span></>}
        intro="Destination Diaries does two things for travellers in India: it turns the trips you have taken into diaries you can read like a book, and it helps you plan the next one with a planner you can trust, question and change."
      />
      <Prose>
        <h2>The diaries</h2>
        <p>
          A camera roll is not a memory. A diary gives a journey a shape: chapters, a few chosen
          photographs, the line you scribbled in the margin. You choose a binding, write as much or
          as little as you like, and turn the pages. Your diaries are saved privately in your own
          browser. The diaries on our <a href="/discover">shelf</a> are examples written by our team.
        </p>

        <h2>Why we built the planner</h2>
        <p>
          Planning a trip in India means holding a lot in your head at once — distances that look
          short on a map and are not, monuments that close on a particular weekday, a budget that has
          to stretch across stays, food and getting around. Generic AI itineraries read well but
          rarely check any of that.
        </p>
        <p>
          So the heart of this product is not a chatbot. It is a planning engine that scores places
          against what you care about, groups them by geography, schedules them against the clock and
          adds up the cost — and only then uses AI to explain the result in plain language.
        </p>

        <h2 id="data">Data sources and credits</h2>
        <p>
          The places currently on the site are a hand-curated sample dataset covering{" "}
          {destinations.map((d) => d.name).join(", ")}. Place names are real; locations are
          approximate and every listing is marked unverified until it has been checked. We do not
          publish prices, ratings or opening hours without a reliable source.
        </p>
        <p>
          Our import pipeline is designed for openly licensed data, including OpenStreetMap
          (© OpenStreetMap contributors, available under the Open Database License). Any place
          imported from a provider keeps a record of where it came from, under what licence, and when
          it was fetched. Interactive maps are provided by Mapbox where configured.
        </p>
        <p>Photographs are by Wikimedia Commons contributors, used under their Creative Commons licences:</p>
        <ul>
          {destinations.filter((d) => d.heroImageAttribution).map((d) => (
            <li key={d.slug}>{d.heroImageAttribution}</li>
          ))}
        </ul>

        <h2>Get in touch</h2>
        <p>Found something wrong, or want your town covered? <a href="/contact">Write to us</a>.</p>
      </Prose>
    </>
  );
}
