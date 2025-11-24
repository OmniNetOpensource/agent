export const TOOL_RESULT_CHAR_LIMIT = 1500;

export function truncateToolResult(value: string): string {
  if (value.length <= TOOL_RESULT_CHAR_LIMIT) {
    return value;
  }
  return `${value.slice(0, TOOL_RESULT_CHAR_LIMIT)}…`;
}

export function prettyPrintArgs(args: Record<string, unknown>): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return "{}";
  }
}
