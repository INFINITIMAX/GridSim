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
import md7 from "../../docs/learn/pelton/lectia-07.md?raw";
import md8 from "../../docs/learn/pelton/lectia-08.md?raw";
import md9 from "../../docs/learn/pelton/lectia-09.md?raw";
import md10 from "../../docs/learn/pelton/lectia-10.md?raw";
import md11 from "../../docs/learn/pelton/lectia-11.md?raw";
import md12 from "../../docs/learn/pelton/lectia-12.md?raw";

const MD: Record<number, string> = { 1: md1, 2: md2, 3: md3, 4: md4, 5: md5, 6: md6, 7: md7, 8: md8, 9: md9, 10: md10, 11: md11, 12: md12 };
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// Afirmații fără a doua sursă: nu au voie în UI (plan.md). B5 nu spune „de găsit” în rând, deci o ținem explicit.
// F6, G9, I7, J6, L6 (exemplele lucrate din S7, S19, S8, S13) sunt doar control în teste. K7 (încălzirea cu balast) are o singură sursă.
const BANNED = ["A11", "A12", "B5", "C8", "F6", "G9", "I7", "J6", "K7", "L6"];
// G8 are rândul parțial „de găsit”: doar valoarea de ambalare 1,8–1,9 (S19 tab. 6.6). Restul afirmației (puterea e zero la u = v₁)
// e consecință a G3 și are voie în UI; partea „de găsit” nu are voie pe ecran (verificat mai jos).
const PARTIAL = ["G8"];

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

  it("toate cele 12 lecții sunt deblocate și au date; titlul lecției n e LESSON_TITLES[n-1]", () => {
    expect(UNLOCKED).toBe(12);
    expect(LESSONS).toHaveLength(12);
    LESSONS.forEach((l, i) => {
      expect(l.n).toBe(i + 1);
      expect(l.title).toBe(LESSON_TITLES[i]);
    });
  });

  it.each(ALL)("lecția %i: >= 4 callout-uri și cele 4 tab-uri nevide", (i) => {
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

  it("controlul testului: rândurile G9 și I7 există și conțin „de găsit”", () => {
    expect(claimRow(md7, "G9")).toContain("de găsit");
    expect(claimRow(md9, "I7")).toContain("de găsit");
  });

  it("controlul testului: rândul G8 există și conține „de găsit” (de aceea e în lista PARTIAL)", () => {
    expect(claimRow(md7, "G8")).toContain("de găsit");
  });

  it("controlul testului: J6 și K7 există și conțin „de găsit”", () => {
    expect(claimRow(md10, "J6")).toContain("de găsit");
    expect(claimRow(md11, "K7")).toContain("de găsit");
  });

  it("controlul testului: L6 există și spune că intră doar în teste (rândul nu conține „de găsit”)", () => {
    expect(claimRow(md12, "L6")).toContain("doar în teste");
  });

  it.each(ALL)("lecția %i: fiecare ID folosit are rând în tabel și nu e „de găsit”", (i) => {
    const l = LESSONS[i]!;
    const ids = usedClaims(l);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const row = claimRow(MD[l.n]!, id);
      expect(row, `L${l.n}: ${id} lipsește din tabel`).toBeDefined();
      if (!PARTIAL.includes(id)) expect(row, `L${l.n}: ${id} e „de găsit”`).not.toContain("de găsit");
    }
  });

  it("afirmațiile interzise (A11, A12, B5, C8, F6, G9, I7, J6, K7, L6) nu apar nicăieri", () => {
    const all = LESSONS.flatMap(usedClaims);
    for (const id of BANNED) expect(all).not.toContain(id);
  });

  it("partea „de găsit” din G8 (ambalarea 1,8–1,9 × turația nominală) nu apare în textele lecției 7", () => {
    const text = [LESSONS[6]!.intro.text, ...facts(LESSONS[6]!).map((f) => f.text)].join("\n");
    expect(text).not.toMatch(/1[.,]8/);
    expect(text).not.toMatch(/1[.,]9/);
  });

  it.each([6, 7, 8, 9, 10, 11])("lecția %i: textele callout-urilor sunt cele din tabelul „Callout-uri” al documentului, verbatim", (i) => {
    const l = LESSONS[i]!;
    for (const c of l.callouts) expect(MD[l.n]!, `L${l.n}: "${c.text}"`).toContain(`| ${c.text} |`);
  });
});
