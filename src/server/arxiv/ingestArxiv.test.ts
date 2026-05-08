import { describe, expect, it } from "vitest";
import type { Source } from "../../domain/models";
import { parseArxivFeedXml } from "./ingestArxiv";

function mockSource(id: string, category: string): Source {
  return {
    id,
    name: "test",
    type: "arxiv_category",
    url: "https://export.arxiv.org/api/query",
    active: true,
    frequency: "daily",
    config_json: { category },
    last_run_at: null,
  };
}

const minimalAtom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.00001v2</id>
    <title> Test   Paper  Title </title>
    <summary>Abstract line.</summary>
    <published>2024-01-15T12:00:00Z</published>
    <updated>2024-01-16T12:00:00Z</updated>
    <author><name>Alice Researcher</name></author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI"/>
  </entry>
</feed>`;

describe("parseArxivFeedXml", () => {
  it("normaliza id, título, autores y categoría primaria", () => {
    const sources = [mockSource("src-ai", "cs.AI")];
    const categories = new Set(["cs.AI"]);
    const out = parseArxivFeedXml(minimalAtom, sources, categories);

    expect(out).toHaveLength(1);
    expect(out[0].external_id).toBe("arxiv:2401.00001");
    expect(out[0].title).toBe("Test Paper Title");
    expect(out[0].authors).toEqual(["Alice Researcher"]);
    expect(out[0].categories).toContain("cs.AI");
    expect(out[0].source_id).toBe("src-ai");
    expect(out[0].url).toContain("arxiv.org");
  });

  it("deduplica por external_id", () => {
    const dup = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><id>http://arxiv.org/abs/2401.00001v1</id><title>A</title><summary>s</summary><published>2024-01-15T12:00:00Z</published></entry>
<entry><id>http://arxiv.org/abs/2401.00001v2</id><title>B</title><summary>s</summary><published>2024-01-15T12:00:00Z</published></entry>
</feed>`;
    const sources = [mockSource("s1", "cs.AI")];
    const out = parseArxivFeedXml(dup, sources, new Set(["cs.AI"]));
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("A");
  });
});
