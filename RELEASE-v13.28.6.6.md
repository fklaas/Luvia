# Luvia 13.28.6.7 / Core 4.28.6.7

## Album Photo Grid Recovery

Behebt eine Regression im geöffneten Cluster-Album: Nach der Einführung der Download-, Share- und Polaroid-Aktionen wurde der generische direkte `div`-Selektor des Dialogs auch auf die Aktionszeile angewendet. Gleichzeitig besaßen die neuen visuellen Foto-Container keine eigene intrinsische Höhe. Dadurch blieben nur die Polaroid-Schaltflächen sichtbar, während die Fotos auf Höhe 0 kollabierten.

Der Albumdialog verwendet nun eine explizite `.lv-album-photo-grid`, feste Seitenverhältnisse und einen kanonischen sichtbaren Foto-Container. Desktop zeigt drei Spalten, Mobile zwei Spalten. Die bestehenden Aktionen und der gemeinsame Gallery-Renderer bleiben erhalten.
