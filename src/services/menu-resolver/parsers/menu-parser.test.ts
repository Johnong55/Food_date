import { describe, expect, it } from "vitest";

import {
  discoverMenuLinks,
  parseOfficialMenuHtml,
} from "@/services/menu-resolver/parsers/menu-parser";

describe("official menu parser", () => {
  it("extracts schema.org MenuSection, MenuItem and Offer without executing scripts", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Restaurant",
          "name": "Quán thử",
          "hasMenu": {
            "@type": "Menu",
            "hasMenuSection": {
              "@type": "MenuSection",
              "name": "Ramen",
              "hasMenuItem": [
                {"@type":"MenuItem","name":"Tonkotsu","offers":{"@type":"Offer","price":"129000","priceCurrency":"VND"}},
                {"@type":"MenuItem","name":"Miso","offers":{"@type":"Offer","price":"139000","priceCurrency":"VND"}}
              ]
            }
          }
        }
      </script>
    `;

    const result = parseOfficialMenuHtml(html, new URL("https://restaurant.example/"));
    expect(result?.parser).toBe("json_ld");
    expect(result?.sections[0]?.name).toBe("Ramen");
    expect(result?.sections[0]?.items[0]).toMatchObject({
      name: "Tonkotsu",
      price: 129000,
      currency: "VND",
    });
  });

  it("understands Vietnamese thousands separators in JSON-LD offers", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Menu",
          "name": "Menu",
          "hasMenuItem": [
            {"@type":"MenuItem","name":"Ramen","offers":{"@type":"Offer","price":"129.000","priceCurrency":"VND"}},
            {"@type":"MenuItem","name":"Gyoza","offers":{"@type":"Offer","price":"69,000","priceCurrency":"VND"}}
          ]
        }
      </script>`;

    const parsed = parseOfficialMenuHtml(
      html,
      new URL("https://restaurant.example/menu"),
    );
    expect(parsed?.sections[0]?.items.map((item) => item.price)).toEqual([
      129_000,
      69_000,
    ]);
  });

  it("uses bounded static HTML selectors and discovers menu links", () => {
    const html = `
      <a href="/thuc-don">Xem thực đơn</a>
      <section class="menu-section"><h2>Nước</h2>
        <article class="menu-item"><h3>Trà đào</h3><span class="price">49.000đ</span></article>
        <article class="menu-item"><h3>Cafe sữa</h3><span class="price">39.000đ</span></article>
      </section>
    `;
    const source = new URL("https://restaurant.example/");
    const result = parseOfficialMenuHtml(html, source);

    expect(result?.parser).toBe("static_html");
    expect(result?.sections[0]?.items[0]?.price).toBe(49000);
    expect(discoverMenuLinks(html, source)).toEqual([
      "https://restaurant.example/thuc-don",
    ]);
  });
});
