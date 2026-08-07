# Luvia 13.34.1 / Core 4.34.1 — Memory Flight Interaction Fix

- Repariert den nicht reagierenden `Reise starten`-Button: Scene-UI wird synchron montiert, Event-Handler werden nicht mehr vor dem DOM-Aufbau gebunden.
- Derselbe Race-Condition-Fix gilt für KI-, Tages-, Moment-, Cover- und Navigationsinteraktionen im Memory Sceneflow.
- Fluganimation vollständig auf kontinuierlichen organischen Flug umgestellt. Keine A/B/C-Punkte, keine starre Gesamtstrecke, kein Zurückpendeln.
- Das Flugzeug bleibt dauerhaft in Bewegung und erhält pro Durchflug eine neue unregelmäßige Kurve. Sichtbar ist nur eine kurze, auslaufende Kondensspur.
- Rechteckige/harte Wolkenartefakte im Flight-Shader entfernt; Flight-Szene nutzt weiche prozedurale Wolkenformen.
- Galerie, Places, Foursquare und Media-Pipeline unverändert in ihrer Logik.
