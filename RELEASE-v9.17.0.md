# Luvia v9.17.0 — Intelligence Core v2.10.0 Secure Backend

## Ziel

Core V2.10 führt eine zentrale, abgesicherte Backend-Grenze zwischen Luvia-Modulen und externen Diensten ein. Browser-Module erhalten keine Secrets und sprechen künftig ausschließlich die öffentliche Core-API beziehungsweise das Edge-Gateway an.

## Neu

- `LuviaBackend` / `LuviaSecureBackend` als öffentliche Core-API.
- Zentraler Edge-Function-Endpunkt `luvia-gateway`.
- Authentifizierte Requests über die aktive Supabase-Sitzung.
- Strikte Aktionsvalidierung und serverseitige Action-Allowlist.
- Korrelationsfähige Request-IDs in Client, Response, Events und Logs.
- Harte Request-Timeouts und normalisierte Fehlercodes.
- Redaction sensibler Felder vor Diagnose und Logging.
- Keine Speicherung oder Ausgabe von Authorization-Headern und Secrets.
- CORS-Allowlist für produktive Domain und lokale Entwicklung.
- Basis-Rate-Limiting pro Client und Aktion.
- Strukturierte JSON-Logs der Edge Function.
- Öffentlicher, ungefährlicher Health-Endpunkt `system.health`.
- Backend-Service in Kernel Registry, Developer Console und Diagnosetests integriert.
- `LuviaIntelligence.invoke()` delegiert ab sofort an das Secure Backend.

## Edge Function

Quellcode:

```text
supabase/functions/luvia-gateway/
```

Deployment:

```bash
supabase functions deploy luvia-gateway
supabase secrets set LUVIA_ALLOWED_ORIGINS="https://myluvia.app,https://www.myluvia.app"
```

Die Google-Places- und AI-Secrets werden erst in den jeweiligen Roadmap-Versionen serverseitig ergänzt. Sie dürfen niemals in `config.js`, HTML, Browser-JavaScript oder GitHub-Secrets-Ausgaben landen.

## Sicherheitshinweis

`verify_jwt = false` ist bewusst gesetzt, weil der Health-Endpunkt öffentlich erreichbar sein soll. Alle geschützten Aktionen validieren das Bearer-Token innerhalb des Gateways selbst und werden ohne aktive Nutzer-ID abgewiesen. Neue Aktionen müssen ausdrücklich in der serverseitigen Action-Routing-Schicht freigeschaltet werden.

## Versionen

- Build: `9.17.0`
- Intelligence Core: `2.10.0`
- Service: `2.10.0-secure-backend`
- PWA Cache: `luvia-shell-v9.17.0`
