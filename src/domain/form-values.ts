
export function nextId(prefix: string, ids: string[]) {
  const next =
    Math.max(
      0,
      ...ids
        .filter((id) => id.startsWith(prefix))
        .map((id) => Number(id.replace(prefix, "")))
        .filter(Number.isFinite),
    ) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function numberValue(form: FormData, name: string) {
  const raw = form.get(name);
  const value = typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
  return form.get(name) === null || String(form.get(name)).trim() === "" ? NaN : value;
}

export function textValue(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export function boolValue(form: FormData, name: string) {
  return textValue(form, name) === "ja";
}
