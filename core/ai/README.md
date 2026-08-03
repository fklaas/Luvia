# Luvia Brain Core

`core/ai` ist ab Build 13.17.0 die einzige öffentliche Intelligenzschicht der App. Module dürfen weder OpenAI noch eine Supabase-AI-Function direkt aufrufen.

## Architektur

```text
Module / UI
→ LuviaAI
→ Capability Registry
→ Context Engine
→ Model Router
→ Policy + Output Validator
→ OpenAI Provider über luvia-intelligence
→ kontrollierte Luvia-Core-Tools
```

## Zentrale Regeln

1. OpenAI ist ein austauschbarer Provider, nicht die öffentliche App-API.
2. Der Browser übermittelt nur `fast`, `default` oder `deep`; Modell-IDs bleiben serverseitig.
3. Supabase, RLS, Providerdaten und harte Domain-Contracts bleiben die Wahrheit.
4. Die KI darf nur fachlich validierte Places-/Move-Kandidaten neu gewichten.
5. Schreibende Vorschläge sind `DRAFT` und benötigen eine sichtbare Benutzerbestätigung.
6. Lernsignale bleiben getrennt von ausdrücklich bestätigten Profilpräferenzen; nur eine bewusste Bestätigung im Profil darf sie über `LuviaUserPreferences` übernehmen.
7. Jeder Aufruf erhält nur den minimal erforderlichen, bereinigten Kontext.
8. Bei Ausfall greift ein deterministischer Fallback; die App bleibt bedienbar.

## Öffentliche Fassade

```javascript
LuviaAI.run(capability, input, options)
LuviaAI.ask(input, options)
LuviaAI.plan(input, options)
LuviaAI.recommend(input, options)
LuviaAI.rank(input, options)
LuviaAI.explain(input, options)
LuviaAI.summarize(input, options)
LuviaAI.proposeAction(input, options)
LuviaAI.learnFromEvent(event)
LuviaAI.planDiscovery(domain, result)
LuviaAI.rankCandidates({ domain, contract, candidates })
LuviaAI.health()
LuviaAI.subscribe(listener)
LuviaAI.diagnostics()
```

## Erste Capabilities

- `brain.ask`
- `discovery.plan`
- `discovery.rank`
- `dashboard.brief`
- `timeline.propose`
- `memory.extract`
- `text.summarize`

Neue Module registrieren eine Capability und geeignete Read-Tools, statt eine eigene Intelligence-Architektur aufzubauen.
