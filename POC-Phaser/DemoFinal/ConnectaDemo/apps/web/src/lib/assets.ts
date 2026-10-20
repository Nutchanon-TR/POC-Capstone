/** Next applies basePath to Link; public asset URLs need the same prefix. */
export function asset(path: string) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${path.replace(/^\//, "")}`;
}
