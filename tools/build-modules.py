#!/usr/bin/env python3
"""Buildet die bearbeitbaren Modulfragmente zurück in index.html.
Vor Änderungen wird index.html als index.before-module-build.html gesichert.
"""
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
MAP={
'hero':['#reise-hero'],'assistant':['#travelAssistant'],'liveMoments':['#live-moments'],'apps':['#reise-apps'],'language':['#sprachcoach'],'mobility':['.intro','.summary'],'restaurants':['.highlight-section'],'budget':['#budget-tracker'],'gallery':['#reisegalerie','#smartPhotoMoments'],'photoSpots':['#fotospots'],'memories':['#erinnerungen'],'dayPlans':['.day-group'],'review':['#reise-revue'],'travelBook':['#reisebuch'],'closing':['#seineTrip','#paris-moments']}
html=INDEX.read_text(encoding='utf-8')
(INDEX.parent/'index.before-module-build.html').write_text(html,encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
for name,selectors in MAP.items():
    fragment=BeautifulSoup((ROOT/'modules/content'/f'{name}.html').read_text(encoding='utf-8'),'html.parser')
    replacements=[n for n in fragment.contents if getattr(n,'name',None)]
    current=[]
    for selector in selectors: current.extend(soup.select(selector))
    if len(current)!=len(replacements):
        raise SystemExit(f'{name}: erwartet {len(current)} Blöcke, Fragment enthält {len(replacements)}')
    for old,new in zip(current,replacements): old.replace_with(new)
INDEX.write_text(str(soup),encoding='utf-8')
print('index.html wurde aus modules/content neu aufgebaut.')
