export type HeaderNavMenuItem = {
  label: string;
  url: string;
};

export type HeaderNavMenuGroup = {
  title: string;
  items: HeaderNavMenuItem[];
};

function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function parseMenuGroups(raw: string | undefined): HeaderNavMenuGroup[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: HeaderNavMenuGroup[] = [];
    for (const g of parsed) {
      if (
        !g ||
        typeof g !== "object" ||
        typeof (g as HeaderNavMenuGroup).title !== "string" ||
        !(g as HeaderNavMenuGroup).title.trim()
      ) {
        continue;
      }
      const itemsIn = (g as HeaderNavMenuGroup).items;
      if (!Array.isArray(itemsIn)) {
        continue;
      }
      const items: HeaderNavMenuItem[] = [];
      for (const it of itemsIn) {
        if (
          !it ||
          typeof it !== "object" ||
          typeof (it as HeaderNavMenuItem).label !== "string" ||
          typeof (it as HeaderNavMenuItem).url !== "string"
        ) {
          continue;
        }
        const url = (it as HeaderNavMenuItem).url.trim();
        if (!isSafeHttpUrl(url)) {
          continue;
        }
        items.push({
          label: (it as HeaderNavMenuItem).label,
          url,
        });
      }
      if (items.length > 0) {
        out.push({ title: (g as HeaderNavMenuGroup).title.trim(), items });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function parseHeaderNavMenusFromJson(raw: string | undefined): HeaderNavMenuGroup[] {
  return parseMenuGroups(raw);
}
