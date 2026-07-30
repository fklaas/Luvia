# Luvia Build 13.8.1.1 / Core 4.8.1.1

## Places Detail Capability Routing Fix

Build 13.8.1.1 behebt einen Architekturfehler beim Öffnen von Place-Detailkarten aus Timeline, Dashboard und anderen externen Einstiegen.

## Behobener Fehler

Der Fotospot-Bereich `Licht, Motiv und Zugang` war in der direkten Fotospot-Detailkarte vorhanden, fehlte aber beim Öffnen desselben Orts aus der Reise-Timeline. Der externe Einstieg erzeugte eine reduzierte generische Detailkarte und übersprang dabei den typabhängigen Fotospot-Bereich. Dadurch konnte ein Fotospot außerdem fälschlich mit einem allgemeinen Aktivitäts-Lebenszyklus erscheinen.

## Umsetzung

- Timeline- und Dashboard-Aufrufe delegieren zuerst an die echte Detailkarte des angeforderten Place-Typs.
- `photo_spot` kann seine Cloud-Entity beim externen Öffnen selbstständig nachladen, auch wenn das Fotospot-Modul gerade nicht sichtbar ist.
- Der globale `LuviaPlaceDetail` Core besitzt nun registrierbare typabhängige Capability-Renderer.
- `photo_spot` registriert `Licht, Motiv und Zugang` als globalen Capability-Renderer.
- Der generische Detailkarten-Fallback zeigt dadurch ebenfalls die Fotospot-Insights.
- Beim Nachladen von Providerdetails bleibt der angeforderte Luvia-Place-Typ erhalten. Ein Fotospot wird nicht mehr durch eine Google-Kategorie wie Museum oder Sehenswürdigkeit in eine Aktivitätskarte umgewandelt.
- Direkter Modulaufruf und externer Timeline-Aufruf verwenden damit denselben fachlichen Detailumfang.

## Architektur

Es wurde keine zweite Fotospot-Detailkarte angelegt. Die Lösung erweitert den globalen Place-Detail-Core um einen wiederverwendbaren Capability-Vertrag, den kommende Place-Typen ebenfalls verwenden können.

## Daten und Backend

- keine SQL-Migration
- keine neuen Tabellen oder Felder
- keine Änderungen an Favoriten- oder Timeline-Persistenz
- keine neuen Secrets
- Gateway-Fachlogik unverändert; Health- und Versionsausgabe auf 13.8.1.1 / 4.8.1.1 angehoben

## Bekannte Grenzen

Typabhängige Detailbereiche werden nur angezeigt, wenn der jeweilige Place-Typ einen Capability-Renderer registriert hat. Für `photo_spot` ist dieser Vertrag vollständig aktiv.
