import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses headers and rows into objects", () => {
    const { rows, headers } = parseCsv("Name,Email\nJo,jo@x.com\nAmy,amy@y.com");
    expect(headers).toEqual(["Name", "Email"]);
    expect(rows).toEqual([
      { Name: "Jo", Email: "jo@x.com" },
      { Name: "Amy", Email: "amy@y.com" },
    ]);
  });
  it("returns empty rows for a headers-only file", () => {
    const { rows, headers } = parseCsv("Name,Email");
    expect(headers).toEqual(["Name", "Email"]);
    expect(rows).toEqual([]);
  });
  it("returns empty headers and rows for an empty string", () => {
    const { rows, headers } = parseCsv("");
    expect(rows).toEqual([]);
    expect(headers).toEqual([]);
  });
});
