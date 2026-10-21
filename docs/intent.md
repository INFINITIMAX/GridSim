# Intent: GridSim
Status: aprobat (21-10-2026)

## Problema
Aproape nimeni nu înțelege cum funcționează rețeaua electrică: că producția trebuie să egaleze consumul în fiecare secundă, că frecvența de 50 Hz arată acest echilibru, de ce contează inerția, de ce solarul nu poate înlocui singur o centrală și ce e un blackout. Explicațiile existente sunt text, grafice sau video pasiv. Nu există o jucărie interactivă și frumoasă în care să „simți” rețeaua.

## Rezultat propus
Un simulator web gamificat, în 3D (three.js), în stilul learn-arduino-red.vercel.app. Utilizatorul adaugă consumatori și surse (hidro, termo, nuclear, solar, eolian, baterie) și vede în timp real frecvența, echilibrul și consecințele: reglaj automat, deconectarea consumatorilor, blackout.

Prima livrare e o **felie verticală**: un singur nivel jucabil, construit pe un model fizic testat. Primul nivel demontează concepția greșită „rețeaua stochează energie”, arătând că echilibrul se face secundă cu secundă și că frecvența îl măsoară.

## Utilizatori/sisteme afectate
- Public larg, curios de tehnologie, venit de pe X (în engleză).
- Secundar: studenți, oameni din energie și construcții.
- Lucian: portofoliu și învățare (opțional, model oglindit în Python).

## Constrângeri
- Tot pe `D:\GridSim`, Windows/PowerShell; nimic instalat pe C:.
- Fizica trebuie să fie corectă. Modelul (swing equation, reglaj primar/secundar/terțiar după SO GL, UFLS la 49,0 Hz) e testat la ±10% față de calcule de mână înainte de orice UI.
- Design original. Inspirat de Learn Arduino (Dilum Sanjaya), fără să copiem asset-uri, cod sau layout.
- Merge în browser cu WebGL, desktop și telefon.
- Fluxul de 4 agenți se aplică (proiect cornerstone).

## Decizii (21-10-2026)
- **Modele 3D:** din cod, low-poly, cu primitive three.js. Mai târziu trecem la Blender sau la o soluție mai ușoară (de evaluat: Spline, generatoare AI text-to-3D, pachete CC0).
- **Stack:** Vite + TypeScript + three.js vanilla.
- **Limba:** doar engleză.
- **Repo/host:** GitHub public + Vercel.

- **Nume:** GridSim. **Date:** snapshot static ENTSO-E. **Licență:** MIT. **Timp/țintă de lansare:** se decid pe parcurs.
