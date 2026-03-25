export type CsvEmployeeRow = {
  first_name: string;
  last_name: string;
  role_title: string;
  hire_date: string;
  primary_store_code: string;
  starting_position: string;
};

const requiredHeaders = ["first_name", "last_name", "role_title", "hire_date", "primary_store_code", "starting_position"] as const;

export function parseEmployeeCsv(input: string) {
  const lines = input.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return { rows: [] as CsvEmployeeRow[], errors: ["CSV must include a header row and at least one employee row."] };
  }

  const headers = lines[0].split(",").map((cell) => cell.trim());
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    return { rows: [] as CsvEmployeeRow[], errors: [`Missing required headers: ${missing.join(", ")}`] };
  }

  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((cell) => cell.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as CsvEmployeeRow;
  });

  const invalidStartingPositionRows = rows
    .map((row, index) => ({ index: index + 2, startingPosition: row.starting_position.toLowerCase() }))
    .filter((row) => row.startingPosition !== "boh" && row.startingPosition !== "cashier");

  if (invalidStartingPositionRows.length > 0) {
    return {
      rows: [] as CsvEmployeeRow[],
      errors: [
        `Invalid starting_position on row(s): ${invalidStartingPositionRows
          .map((row) => row.index)
          .join(", ")}. Use boh or cashier.`
      ]
    };
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      starting_position: row.starting_position.toLowerCase()
    })),
    errors: [] as string[]
  };
}
