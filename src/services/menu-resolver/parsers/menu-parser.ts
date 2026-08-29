import { load } from "cheerio";

import type { MenuItem, MenuSection } from "@/types/menu";

type JsonRecord = Record<string, unknown>;

export type ParsedOfficialMenu = {
  sections: MenuSection[];
  linkedMenuUrls: string[];
  parser: "json_ld" | "static_html";
};

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maximum = 2_000) {
  if (typeof value !== "string") return undefined;
  const text = load(`<div>${value}</div>`)("div").text().replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maximum) : undefined;
}

function schemaTypes(node: JsonRecord) {
  return asArray(node["@type"])
    .filter((type): type is string => typeof type === "string")
    .map((type) => type.split("/").pop()?.toLocaleLowerCase("en-US"));
}

function hasSchemaType(node: JsonRecord, ...expected: string[]) {
  const types = schemaTypes(node);
  return expected.some((type) => types.includes(type.toLocaleLowerCase("en-US")));
}

function parseCurrency(value: unknown) {
  if (typeof value !== "string") return undefined;
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : undefined;
}

function parseNumericPrice(value: unknown, currency?: string) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s/g, "");
  if (!/^\d+(?:[.,]\d+)?$/.test(normalized)) return undefined;
  if (currency === "VND" && /^\d{1,3}(?:[.,]\d{3})+$/.test(normalized)) {
    const price = Number(normalized.replace(/[.,]/g, ""));
    return Number.isFinite(price) ? price : undefined;
  }
  const decimalSeparator = normalized.includes(".") && normalized.includes(",")
    ? normalized.lastIndexOf(".") > normalized.lastIndexOf(",")
      ? "."
      : ","
    : undefined;
  const thousandsSeparator = decimalSeparator === "." ? "," : ".";
  const numeric = decimalSeparator
    ? normalized
        .replaceAll(thousandsSeparator, "")
        .replace(decimalSeparator, ".")
    : normalized.replace(",", ".");
  const price = Number(numeric);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

function parseOffer(node: JsonRecord) {
  const offers = asArray(node.offers).filter(isRecord);
  const offer = offers[0];
  if (!offer) return {};
  const currency = parseCurrency(offer.priceCurrency);
  const price = parseNumericPrice(offer.price, currency);
  return price !== undefined && currency ? { price, currency } : {};
}

function parseJsonItem(node: JsonRecord, index: number): MenuItem | undefined {
  if (!hasSchemaType(node, "MenuItem", "Product")) return undefined;
  const name = cleanText(node.name, 200);
  if (!name) return undefined;
  return {
    id: `official-item-${index}`,
    name,
    description: cleanText(node.description),
    ...parseOffer(node),
    sortOrder: index,
  };
}

function parseJsonSection(
  node: JsonRecord,
  sectionIndex: number,
  itemCounter: { value: number },
): MenuSection[] {
  const directItems = asArray(node.hasMenuItem)
    .filter(isRecord)
    .flatMap((item) => {
      const parsed = parseJsonItem(item, itemCounter.value++);
      return parsed ? [parsed] : [];
    });
  const sectionName = cleanText(node.name, 120) ?? `Món ${sectionIndex + 1}`;
  const current = directItems.length
    ? [
        {
          id: `official-section-${sectionIndex}`,
          name: sectionName,
          sortOrder: sectionIndex,
          items: directItems,
        },
      ]
    : [];

  const nested = asArray(node.hasMenuSection)
    .filter(isRecord)
    .flatMap((section, index) =>
      parseJsonSection(section, sectionIndex + index + current.length, itemCounter),
    );
  return [...current, ...nested];
}

function collectJsonNodes(value: unknown, nodes: JsonRecord[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonNodes(item, nodes));
    return;
  }
  if (!isRecord(value)) return;
  nodes.push(value);
  Object.values(value).forEach((item) => collectJsonNodes(item, nodes));
}

function dedupeSections(sections: MenuSection[]) {
  const seenItems = new Set<string>();
  return sections
    .map((section, sectionIndex) => ({
      ...section,
      id: `official-section-${sectionIndex}`,
      sortOrder: sectionIndex,
      items: section.items.filter((item) => {
        const key = `${section.name}\u0000${item.name}\u0000${item.price ?? ""}`.toLocaleLowerCase(
          "vi-VN",
        );
        if (seenItems.has(key)) return false;
        seenItems.add(key);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0)
    .slice(0, 50);
}

function parseJsonLd(html: string, sourceUrl: URL): ParsedOfficialMenu | undefined {
  const $ = load(html);
  const nodes: JsonRecord[] = [];
  $("script[type='application/ld+json']").each((_index, element) => {
    const raw = $(element).text().trim();
    if (!raw || raw.length > 1_000_000) return;
    try {
      collectJsonNodes(JSON.parse(raw) as unknown, nodes);
    } catch {
      // Ignore one malformed block and keep inspecting the remaining structured data.
    }
  });

  const linkedMenuUrls = nodes.flatMap((node) => {
    if (!hasSchemaType(node, "Restaurant", "FoodEstablishment")) return [];
    return asArray(node.hasMenu).flatMap((menu) => {
      if (typeof menu !== "string") return [];
      try {
        return [new URL(menu, sourceUrl).toString()];
      } catch {
        return [];
      }
    });
  });

  const itemCounter = { value: 0 };
  const menuNodes = nodes.filter((node) => hasSchemaType(node, "Menu", "MenuSection"));
  const sections = dedupeSections(
    menuNodes.flatMap((menu, index) => parseJsonSection(menu, index, itemCounter)),
  );

  if (sections.reduce((total, section) => total + section.items.length, 0) < 2) {
    return linkedMenuUrls.length
      ? { sections: [], linkedMenuUrls, parser: "json_ld" }
      : undefined;
  }
  return { sections, linkedMenuUrls, parser: "json_ld" };
}

function parseDisplayedPrice(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  const currency = /(?:₫|\bVND\b|\bVNĐ\b|\bđ)/i.test(text)
    ? "VND"
    : /\$|\bUSD\b/i.test(text)
      ? "USD"
      : undefined;
  if (!currency) return {};
  const match = text.match(/\d[\d.,]*/);
  if (!match) return {};
  const compact = match[0].replace(/[.,](?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const price = Number(compact);
  return Number.isFinite(price) ? { price, currency } : {};
}

function parseStaticHtml(html: string): ParsedOfficialMenu | undefined {
  const $ = load(html);
  $("script,style,noscript,template,svg").remove();
  const selectors = [
    "[itemtype$='/MenuItem']",
    "[itemtype$='/Product']",
    "[data-menu-item]",
    ".menu-item",
    ".menu_item",
  ].join(",");
  const sections = new Map<string, MenuItem[]>();
  let itemIndex = 0;

  $(selectors).slice(0, 250).each((_index, element) => {
    const node = $(element);
    const name = cleanText(
      node.find("[itemprop='name'],.item-name,.menu-item-name,.name,h3,h4").first().text(),
      200,
    );
    if (!name) return;
    const priceText = node
      .find("[itemprop='price'],.item-price,.menu-item-price,.price")
      .first()
      .text();
    const sectionNode = node.closest("section,.menu-section,.menu_category,.category");
    const sectionName =
      cleanText(sectionNode.find("h1,h2,h3,[data-section-name]").first().text(), 120) ??
      "Thực đơn";
    const description = cleanText(
      node.find("[itemprop='description'],.description,.item-description").first().text(),
    );
    const item: MenuItem = {
      id: `official-html-item-${itemIndex}`,
      name,
      description,
      ...parseDisplayedPrice(priceText),
      sortOrder: itemIndex,
    };
    itemIndex += 1;
    sections.set(sectionName, [...(sections.get(sectionName) ?? []), item]);
  });

  if (itemIndex < 2) return undefined;
  return {
    parser: "static_html",
    linkedMenuUrls: [],
    sections: [...sections.entries()].slice(0, 50).map(([name, items], index) => ({
      id: `official-html-section-${index}`,
      name,
      sortOrder: index,
      items,
    })),
  };
}

export function parseOfficialMenuHtml(html: string, sourceUrl: URL) {
  const structured = parseJsonLd(html, sourceUrl);
  if (structured?.sections.length) return structured;
  const staticMenu = parseStaticHtml(html);
  if (staticMenu) {
    return {
      ...staticMenu,
      linkedMenuUrls: structured?.linkedMenuUrls ?? [],
    };
  }
  return structured;
}

export function discoverMenuLinks(html: string, sourceUrl: URL) {
  const $ = load(html);
  const links: string[] = [];
  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href");
    const label = $(element).text().replace(/\s+/g, " ").trim();
    if (!href || !/(menu|thực đơn|thuc-don|food|products|order)/i.test(`${href} ${label}`)) {
      return;
    }
    try {
      links.push(new URL(href, sourceUrl).toString());
    } catch {
      // Ignore malformed links.
    }
  });
  return [...new Set(links)].slice(0, 10);
}
