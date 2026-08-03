# Luvia 13.16.0 · Core 4.16.0

## Guided Discovery & Global Preference Foundation

Build 13.16.0 ersetzt die statischen Einstiege von Places und Move durch eine gemeinsame, flüssige **Luvia Guided Discovery Sequence**. Sie verhält sich wie eine zusammenhängende App-Sequenz: vollflächige Szenen, gestaffelt einfliegende Gedankenwolken, weiche Übergänge, leichtes Parallax, haptische Rückmeldung und ein Flugzeug, das den Fortschritt entlang einer Route sichtbar macht.

## Globale Reisevorlieben

Der Registrierungsprozess fragt nun verbindlich ab:

- Interessen und Reiseerlebnisse
- Ernährungsweise
- bevorzugten Reisestil
- Aktivitäten und Indoor-/Outdoor-Vorlieben
- Reisetempo
- Budgetstil

Die Angaben werden in den Auth-Metadaten und anschließend in den vorhandenen Profilfeldern `dietary_preferences` und `travel_preferences` gespeichert. Im Profil steht dafür der neue Bereich **Vorlieben** bereit. Änderungen gelten danach global für Places, Move und die Recommendation-Services.

## Places

Beim Öffnen von Places startet standardmäßig die geführte Sequenz. Der Nutzer wird von der gewünschten Erlebnisrichtung über eine passende Unterauswahl und den situativen Kontext bis zum Suchradius geführt. **Mehr entdecken** erweitert jede Szene kontrolliert; **Direkt stöbern** bleibt als schneller Alternativweg erhalten.

Erst nach Abschluss des Flows entsteht ein strikter Discovery Contract. Er enthält eine feste Google-Typ-Whitelist, Standortbeschränkung, Qualitätsanforderungen sowie profilabhängige Bedingungen. Fachfremde Ergebnisse werden nicht zum Auffüllen verwendet. Wenige oder keine exakten Treffer sind zulässiger als falsche Treffer.

## Move

Move verwendet dieselbe Sequenz-Engine mit eigenen Fragen zu Reiseanlass, Verkehrsmittel, Prioritäten und Entfernung. Die Kategorien bleiben fachlich isoliert. Eine Fähren-Auswahl akzeptiert beispielsweise ausschließlich Fährterminal- und Fährdiensttypen.

Move ist bewusst **ohne Timeline**:

- keine Aktion „Zur Timeline“
- kein `planned_at`
- keine Planungskapazität im Place Contract
- keine Move-Einträge im Timeline-Core

Verfügbare Aktionen bleiben Details, Route/Anbieter, Merken und Teilen.

## Visuelle Sprache

Alle Wolken kombinieren die aktive Reisefarbe mit einem deterministischen Begleitton aus Rosa, Pfirsich, Lavendel, Creme, Mint oder Himmelblau. Die Oberfläche ist mobile-first, unterstützt Edge-Swipe zurück und respektiert `prefers-reduced-motion` sowie die reduzierte Bewegung aus dem Profil.

## Technische Grundlage

Neu:

- `core/preferences/preference-schema.js`
- `core/preferences/discovery-contract-service.js`
- `core/preferences/guided-discovery-sequence.js`
- `core/preferences/guided-discovery-sequence.css`

Der vorhandene Place-Core bleibt verbindlich. Es wurden keine parallelen Karten-, Detail-, Favoriten- oder Cloud-Systeme angelegt.
