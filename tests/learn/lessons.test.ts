// Date lecții: structură + integritatea afirmațiilor față de docs/learn/pelton/lectia-0N.md.
// Markdown-ul vine prin importul Vite ?raw (repo-ul nu are @types/node, deci fără node:fs).
import { describe, expect, it } from "vitest";
import { LESSONS, LESSON_TITLES, UNLOCKED } from "../../learn/lessons";
import type { Fact, Lesson } from "../../learn/lessons";
import md1 from "../../docs/learn/pelton/lectia-01.md?raw";
import md2 from "../../docs/learn/pelton/lectia-02.md?raw";
import md3 from "../../docs/learn/pelton/lectia-03.md?raw";
import md4 from "../../docs/learn/pelton/lectia-04.md?raw";
import md5 from "../../docs/learn/pelton/lectia-05.md?raw";
import md6 from "../../docs/learn/pelton/lectia-06.md?raw";

const MD: Record<number, string> = { 1: md1, 2: md2, 3: md3, 4: md4, 5: md5, 6: md6 };
// Afirmații fără a doua sursă: nu au voie în UI (plan.md). B5 nu spune „de găsit” în rând, deci o ținem explicit.
// F6 (exemplul S7) e doar control în teste.
const BANNED = ["A11", "A12", "B5", "C8", "F6"];

function facts(l: Lesson): Fact[] {
  return [...l.rows, ...l.parts, ...l.how, ...l.specs, ...l.callouts];
}
function usedClaims(l: Lesson): string[] {
  return [...new Set([...l.intro.claims, ...facts(l).flatMap((f) => f.claims)])].sort();
}
/** Rândul `| ID | ... |` din tabelul „Afirmații și surse”, sau undefined. */
function claimRow(md: string, id: string): string | undefined {
  const at = md.indexOf("## Afirmații și surse");
  if (at < 0) return undefined;
  return md.slice(at).match(new RegExp(`^\\|\\s*${id}\\s*\\|.*$`, "m"))?.[0];
}

describe("structura lecțiilor", () => {
  it("12 titluri distincte, nevide", () => {
    expect(LESSON_TITLES).toHaveLength(12);
    expect(new Set(LESSON_TITLES).size).toBe(12);
    for (const t of LESSON_TITLES) expect(t.trim()).not.toBe("");
  });

  it("primele 6 lecții sunt deblocate și au date; titlul lecției n e LESSON_TITLES[n-1]", () => {
    expect(UNLOCKED).toBe(6);
    expect(LESSONS).toHaveLength(6);
    LESSONS.forEach((l, i) => {
      expect(l.n).toBe(i + 1);
      expect(l.title).toBe(LESSON_TITLES[i]);
    });
  });

  it.each([0, 1, 2, 3, 4, 5])("lecția %i: >= 4 callout-uri și cele 4 tab-uri nevide", (i) => {
    const l = LESSONS[i]!;
    expect(l.callouts.length).toBeGreaterThanOrEqual(4);
    expect(l.rows.length).toBeGreaterThan(0); // Overview
    expect(l.parts.length).toBeGreaterThan(0); // Parts
    expect(l.how.length).toBeGreaterThan(0); // How it works
    expect(l.specs.length).toBeGreaterThan(0); // Specs
    expect(l.intro.text.trim()).not.toBe("");
  });

  it("orice text afirmat are cel puțin un ID de afirmație", () => {
    for (const l of LESSONS) {
      for (const f of facts(l)) expect(f.claims.length, `L${l.n}: "${f.text}"`).toBeGreaterThan(0);
      expect(l.intro.claims.length, `L${l.n} intro`).toBeGreaterThan(0);
    }
  });
});

describe("integritatea afirmațiilor", () => {
  it("controlul testului: rândul A11 există și conține „de găsit” (altfel verificarea de mai jos ar fi oarbă)", () => {
    expect(claimRow(md1, "A11")).toContain("de găsit");
  });

  it("controlul testului: rândul F6 există și conține „de găsit”", () => {
    expect(claimRow(md6, "F6")).toContain("de găsit");
  });

  it.each([0, 1, 2, 3, 4, 5])("lecția %i: fiecare ID folosit are rând în tabel și nu e „de găsit”", (i) => {
    const l = LESSONS[i]!;
    const ids = usedClaims(l);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const row = claimRow(MD[l.n]!, id);
      expect(row, `L${l.n}: ${id} lipsește din tabel`).toBeDefined();
      expect(row, `L${l.n}: ${id} e „de găsit”`).not.toContain("de găsit");
    }
  });

  it("afirmațiile interzise (A11, A12, B5, C8, F6) nu apar nicăieri", () => {
    const all = LESSONS.flatMap(usedClaims);
    for (const id of BANNED) expect(all).not.toContain(id);
  });
});
