# Luvia v9.22.14 · Core v2.12.4.14

## Legacy Onboarding Removal

- Der alte Paris-Ersteinrichtungsprozess wurde vollständig aus dem produktiven Projekt entfernt.
- Neue Geräte landen ausschließlich im aktuellen Luvia-Login und anschließend in der modernen Reiseauswahl.
- Die frühere mobile Paris-Sonderroute existiert nicht mehr.
- Bestehende Reise- und Cloud-Daten bleiben kompatibel; nur die veraltete Oberfläche wurde entfernt.
- Einladungslinks verwenden künftig `luvia_join`, alte `paris_join`-Links werden weiterhin einmalig akzeptiert.
- Reiseauswahl, Einladung und aktiver Reisekontext werden jetzt über `luvia-entry.js` gesteuert.
- PWA-, Runtime- und Cache-Versionen wurden angehoben.
