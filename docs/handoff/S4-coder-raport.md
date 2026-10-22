# S4 coder, raport

## Fișiere modificate
- `2d/hydro.ts`: constantele `GENERATOR_EFFICIENCY`, `TRANSFORMER_LOSS`, `RUNNER_COEFFICIENT`; scoase `peakEfficiency`/`partLoad` din `Technology`; descrieri noi; `turbineEfficiency` și `peakEfficiency` (RETScreen Anexa A, citată în comentariu); `operate` cu `ratedHead`, `turbineKW`, `powerKW = turbineKW · gen · (1 − trafo)`, `installedKW` cu lanțul complet; `Operation.turbineKW` (0 la oprire) cu comentariile cerute.
- `2d/panel.ts`: importuri `peakEfficiency`, `sizeById`; în șablon span-ul `.up-option-eff` e gol, iar în `render()` (bucla de la „Turbines”, același mecanism ca restul) primește `X% peak here` sau „–” dacă butonul e dezactivat (cădere nepermisă).

## Semnături noi
- `turbineEfficiency(tech, ratedHead, designFlow, flow): number`
- `peakEfficiency(tech, ratedHead, designFlow): number`

## Decizii / ambiguități
- `peakEfficiency` pentru Francis: Qp = 0,65·Qd·nq^0,05 calculat în funcție (nq duplicat din `turbineEfficiency`). Kaplan: 0,75·Qd. Crossflow: Qd.
- În `operate` am introdus `toGrid = GENERATOR_EFFICIENCY · (1 − TRANSFORMER_LOSS)` ca variabilă locală, ca să nu repet produsul.
- `load` rămâne în `Operation` (calculat ca înainte); nu mai intră în randament.
- Nu am verificat dacă `main.ts` sau altceva construiește obiecte `Operation`/`Technology` manual (grep pe `peakEfficiency|partLoad` nu a găsit alte utilizări în cod, doar în docs).

## De verificat de planner
- `tsc` și testele existente: testele cu valori de mână vechi (randamente, kW) vor pica și trebuie recalculate; orice obiect `Operation` construit în teste cere acum `turbineKW`.
- Dacă Francis la căderi între minHead și Qd/Qp: Qp < Qd mereu pentru căderile permise (altfel împărțire la 0 în ramura Q > Qp); nu am pus gardă, conform briefului.
- `npx tsc --noEmit`, `npx vitest run`, apoi rerulat `scripts/audit_hydro.py` (trebuie actualizat la noile formule, nu l-am atins).
