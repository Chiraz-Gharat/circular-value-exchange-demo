
export type PageId =
  | "start"
  | "cmrs"
  | "marketplace"
  | "offer"
  | "search"
  | "chains"
  | "explain"
  | "database";

export const pageIds: PageId[] = ["start", "cmrs", "marketplace", "offer", "search", "chains", "explain", "database"];

export const pageLabels: Record<PageId, string> = {
  start: "Start",
  cmrs: "Dateneingang",
  marketplace: "Marktplatz",
  offer: "Angebot",
  search: "Gesuch",
  chains: "Kettenplanung",
  explain: "Methodik",
  database: "Datenregister",
};

export function isPageId(value: string): value is PageId {
  return pageIds.includes(value as PageId);
}
