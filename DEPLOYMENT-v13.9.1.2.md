# Deployment – Luvia Build 13.9.1.2

## 1. SQL-Migration

Nicht erforderlich.

## 2. Supabase Edge Function

Erforderlich, damit Gateway-Health und Versionsanzeige Build `13.9.1.2` / Core `4.9.1.2` ausgeben.

Im entpackten Projektordner mit dem Ordner `supabase`:

```bash
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die CLI `luvia-gateway` als deployed meldet und der Health-Check Build `13.9.1.2` sowie Core `4.9.1.2` zurückgibt.

## 3. Secrets

Keine neuen Secrets erforderlich.

## 4. Frontend

```bash
git add .
git commit -m "fix(places): restore global planning schemas for every place type"
git push
```

## 5. PWA-Cache

```text
luvia-shell-v13.9.1.2
```

## 6. Neustart

Nach abgeschlossenem Frontend-Deployment alle Luvia-Tabs und die installierte PWA vollständig schließen und neu öffnen. Falls weiterhin Build 13.9.1 oder 13.9.1.1 angezeigt wird, `force-update.html` einmal ausführen und anschließend Luvia erneut öffnen.

## 7. Abnahme

Nacheinander testen:

1. Restaurant → `Zur Timeline`
2. Unterkunft → `Zur Timeline`
3. Sehenswürdigkeit → `Zur Timeline`
4. Fotospot → `Zur Timeline`
5. Shopping → `Zur Timeline`

Bei allen fünf Typen muss derselbe globale Dialog erscheinen. Die Konsole darf weder `undefined.register` noch `kein Timeline-Schema registriert` enthalten.
