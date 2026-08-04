# Luvia 13.28.2 – AI Memory Bridge

## Ziel
Die Bridge verbindet zentrale Media-Cluster kontrolliert mit kanonischen Places und der Timeline. Sie erzeugt kleine Kontext-Snapshots mit Evidence-Referenzen. Ohne ausdrückliche Bestätigung erfolgt kein fachlicher Write.

## Ablauf
1. Cluster laden.
2. Höchstens zwölf Media-Evidence-Einträge bilden.
3. Nahe kanonische Places innerhalb von 750 Metern bestimmen.
4. Begrenzte Aktionen vorschlagen: Place-Verknüpfung und Timeline-Erinnerung.
5. Vorschlag in `media_memory_proposals` speichern.
6. Erst nach Bestätigung über Media Core, Place Lifecycle Service und Timeline Core ausführen.

## Preview-Fix
Originale bleiben unverändert im privaten Bucket. Zusätzlich wird, soweit der Browser das Format dekodieren kann, `preview.jpg` erzeugt. HEIC/HEIF nutzt `heic2any`; bei fehlender Konvertierung zeigt die UI einen erklärenden Fallback statt einer leeren Fläche.
