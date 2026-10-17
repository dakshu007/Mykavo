import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins plain fields with commas and rows with CRLF", () => {
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\r\nc,d\r\n");
  });

  it("quotes fields containing commas", () => {
    expect(toCsv([["hello, world", "plain"]])).toBe('"hello, world",plain\r\n');
  });

  it("doubles embedded quotes and wraps the field", () => {
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""\r\n');
  });

  it("quotes fields containing newlines (LF and CRLF)", () => {
    expect(toCsv([["line1\nline2"]])).toBe('"line1\nline2"\r\n');
    expect(toCsv([["line1\r\nline2"]])).toBe('"line1\r\nline2"\r\n');
  });

  it("handles a field that combines quotes, commas, and newlines", () => {
    expect(toCsv([['a "b", c\nd']])).toBe('"a ""b"", c\nd"\r\n');
  });

  it("passes unicode through untouched", () => {
    expect(toCsv([["héllo wörld", "日本語", "emoji 🎉"]])).toBe(
      "héllo wörld,日本語,emoji 🎉\r\n",
    );
  });

  it("keeps empty fields as empty columns", () => {
    expect(toCsv([["", "b", ""]])).toBe(",b,\r\n");
  });

  it("returns just the trailing CRLF for an empty row set", () => {
    expect(toCsv([])).toBe("\r\n");
  });

  it("prefixes formula-looking fields with a single quote (CSV injection)", () => {
    expect(toCsv([["=HYPERLINK(\"http://evil\")"]])).toBe('"\'=HYPERLINK(""http://evil"")"\r\n');
    expect(toCsv([["+cmd"]])).toBe("'+cmd\r\n");
    expect(toCsv([["-2+3"]])).toBe("'-2+3\r\n");
    expect(toCsv([["@SUM(A1:A2)"]])).toBe("'@SUM(A1:A2)\r\n");
    expect(toCsv([["\tlead"]])).toBe("'\tlead\r\n");
    expect(toCsv([["\rlead"]])).toBe('"\'\rlead"\r\n');
  });

  it("leaves plain numbers and inner formula characters alone", () => {
    expect(toCsv([["-12", "+3.5", "42", "a=b", "x-y"]])).toBe("-12,+3.5,42,a=b,x-y\r\n");
  });
});
