LUVIA 8.0 – MODULE ARCHITECTURE 2.0

Alle 15 Reisemodule wurden in einen gemeinsamen Komponenten-Lebenszyklus überführt.

Jedes Modul besitzt jetzt:
- version: 2
- gemeinsame Definition und Schema
- Mount-/Unmount-Lebenszyklus
- eindeutig markierte Modulwurzeln
- automatisch identifizierte editierbare Texte, Links und Bilder
- pro Reise speicherbare moduleContent-Daten
- Blueprint-API für einen späteren Onboarding-Editor
- zentrale Akzentvariablen

Wichtige APIs:
LuviaModules.mountModule(id)
LuviaModules.getBlueprint(id)
LuviaModules.setModuleContent(id, content)
LuviaModules.openEditor(trip)

Die sichtbare Paris-Gestaltung bleibt unverändert. Die bisherige HTML-Struktur wird als kompatible Darstellungsschicht weiterverwendet, ist nun aber über die V2-Komponenten registriert und datenmäßig ansteuerbar.
