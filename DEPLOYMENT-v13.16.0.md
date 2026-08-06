# Deployment · Luvia 13.16.0

## Datenbank

**Keine neue SQL-Migration.**

Die globalen Präferenzen verwenden die bereits vorhandenen Profilfelder `dietary_preferences` und `travel_preferences`. Registrierungsangaben werden zunächst zusätzlich in den Supabase-Auth-Metadaten gehalten und nach der ersten Profilinitialisierung in das Cloud-Profil migriert.

## Supabase Gateway

Die Google-Places-Suchparameter wurden um strikte Typfilter und primäre Typfilter erweitert. Deshalb muss das Gateway neu deployt werden:

```bash
supabase functions deploy luvia-gateway
```

Es ist kein neues Secret erforderlich. Der bestehende Google-Schlüssel muss weiterhin für **Places API (New)** freigeschaltet sein.

## Frontend

```bash
git add .
git commit -m "feat(discovery): add guided flows and global travel preferences"
git push
```

## PWA

Der neue Cache lautet:

```text
luvia-shell-v13.16.0
```

Nach dem Deployment alle geöffneten Luvia-Tabs und die installierte PWA schließen, `force-update.html` einmal öffnen und Luvia neu starten.
