# Deployment Build 13.8.1

## 1. SQL-Migrationen

Keine SQL-Migration erforderlich.

## 2. Supabase Edge Function

Die Gateway-Logik wurde nicht fachlich verändert. Die zentrale Versionsausgabe wurde jedoch auf Build 13.8.1 / Core 4.8.1 angehoben. Deshalb aus dem entpackten Projektordner mit dem Verzeichnis `supabase` ausführen:

```bash
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die CLI die Function als deployed meldet und der Gateway-Health-Check Build `13.8.1` sowie Core `4.8.1` ausgibt.

## 3. Secrets

Keine neuen Secrets erforderlich.

## 4. Frontend

```bash
git add .
git commit -m "style(places): refine hub and add reusable insight cards"
git push
```

## 5. PWA-Cache

Neuer Cache:

```text
luvia-shell-v13.8.1
```

Nach abgeschlossenem Deployment die installierte PWA beziehungsweise den Browser-Tab vollständig schließen und neu öffnen.
