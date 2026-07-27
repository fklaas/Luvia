LUVIA v9.17.0 / CORE v2.10.0
SECURE BACKEND

ÖFFENTLICHE API

window.LuviaBackend
window.LuviaSecureBackend
window.LuviaIntelligence.backend

WICHTIGE METHODEN

LuviaBackend.request(action, payload, options)
LuviaBackend.health()
LuviaBackend.probe()
LuviaBackend.diagnostics()
LuviaBackend.testContract()
LuviaBackend.subscribe(listener)

ARCHITEKTUR

Module -> LuviaIntelligence.invoke -> LuviaBackend -> Supabase Edge Function -> externe Provider

Module dürfen keine Provider-Secrets besitzen und externe APIs nicht direkt aufrufen.

EDGE FUNCTION DEPLOYEN

1. Supabase CLI mit dem Projekt verbinden.
2. `supabase functions deploy luvia-gateway` ausführen.
3. Erlaubte Origins setzen:
   `supabase secrets set LUVIA_ALLOWED_ORIGINS="https://myluvia.app,https://www.myluvia.app"`
4. Developer Console öffnen und beim Backend-Service den normalen Vertragstest ausführen.
5. Optional in der Browser-Konsole den echten Endpunkt prüfen:
   `await LuviaBackend.probe()`

Der normale Service-Test führt absichtlich keinen Netzwerkaufruf aus. Dadurch bleibt die Kernel-Diagnose auch offline reproduzierbar. Der explizite Probe-Test überprüft das reale Deployment.
