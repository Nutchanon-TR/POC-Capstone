export function parseSubmissionsCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("A quoted field is not closed.");
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  const header = rows.shift()?.map((v) =>
    v
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase(),
  );
  if (
    !header ||
    ["title", "category", "description", "members"].some(
      (k) => !header.includes(k),
    )
  )
    throw new Error(
      "Expected CSV columns: title, category, description, members.",
    );
  if (rows.length > 200)
    throw new Error("Import up to 200 submissions at a time.");
  return rows.map((cells, index) => {
    const get = (key: string) => cells[header.indexOf(key)]?.trim() ?? "";
    if (!get("title") || !get("members"))
      throw new Error(`Row ${index + 2}: title and members are required.`);
    if (
      get("title").length > 150 ||
      get("description").length > 2000 ||
      get("members").length > 1000
    )
      throw new Error(`Row ${index + 2} exceeds the field length limit.`);
    return {
      title: get("title"),
      category: get("category"),
      description: get("description"),
      members: get("members"),
    };
  });
}
