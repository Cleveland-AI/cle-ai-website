import { describe, expect, it } from "vitest";
import { POPTIN_FIXTURE_PIXEL, POPTIN_PIXEL, poptinSrc } from "@/lib/poptin";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("the Poptin pixel address", () => {
  it("is the real pixel, verbatim", () => {
    expect(POPTIN_PIXEL).toBe("https://cdn.popt.in/pixel.js?id=52c969b3a6878");
  });

  it("is the real pixel in production and on Vercel, even if CONTENT_SOURCE=fixtures leaks there", () => {
    expect(poptinSrc(env({ CONTENT_SOURCE: "sanity" }))).toBe(POPTIN_PIXEL);
    expect(poptinSrc(env({}))).toBe(POPTIN_PIXEL);
    expect(poptinSrc(env({ CONTENT_SOURCE: "fixtures", VERCEL: "1" }))).toBe(POPTIN_PIXEL);
    expect(poptinSrc(env({ CONTENT_SOURCE: "fixtures", VERCEL_ENV: "preview" }))).toBe(POPTIN_PIXEL);
  });

  it("is a local stand-in in a fixtures build, so tests never call Poptin", () => {
    expect(poptinSrc(env({ CONTENT_SOURCE: "fixtures" }))).toBe(POPTIN_FIXTURE_PIXEL);
  });
});
