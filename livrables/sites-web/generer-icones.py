# -*- coding: utf-8 -*-
"""Génère les icônes d'installation de TeamVallée à partir du logo « Signal en Hausse ».

Le logo vit en SVG inline dans TeamVallee.html, mais un manifeste d'application a besoin
de PNG : ce script redessine la même géométrie avec Pillow. Les fichiers produits vont à
la racine du dépôt, là où GitHub Pages les sert.

    python livrables/sites-web/generer-icones.py

À relancer uniquement si le logo change.
"""

import os
from PIL import Image, ImageDraw

JAUNE = (248, 194, 0)
SOMBRE = (26, 26, 26)
SUR = 4  # sur-échantillonnage, pour un rendu lissé au redimensionnement

# Géométrie du logo, en coordonnées 0-100 (identique au SVG de l'application).
LIGNE = [(24, 74), (42, 58), (60, 42), (78, 24)]
POINTS = [((24, 74), 7.0, 0.55), ((42, 58), 7.5, 0.75),
          ((60, 42), 8.0, 0.90), ((78, 24), 9.5, 1.00)]
EPAISSEUR = 9


def melange(couleur, fond, opacite):
    """Aplatit une couleur semi-transparente sur son fond : le PNG final est opaque."""
    return tuple(round(c * opacite + f * (1 - opacite)) for c, f in zip(couleur, fond))


def dessiner(taille, rayon_coins=0.22, marge=0.0):
    """Dessine le logo. `marge` réserve une zone de sécurité pour les icônes masquables."""
    t = taille * SUR
    img = Image.new('RGB', (t, t), SOMBRE)
    d = ImageDraw.Draw(img)

    if rayon_coins:
        # Fond arrondi : on repart d'une image transparente puis on aplatit.
        img = Image.new('RGBA', (t, t), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([0, 0, t - 1, t - 1], radius=int(t * rayon_coins), fill=SOMBRE + (255,))

    # Le contenu occupe (1 - 2*marge) de la surface, centré.
    echelle = t * (1 - 2 * marge) / 100.0
    decalage = t * marge
    pos = lambda p: (decalage + p[0] * echelle, decalage + p[1] * echelle)

    largeur = max(1, round(EPAISSEUR * echelle))
    ligne = [pos(p) for p in LIGNE]
    d.line(ligne, fill=melange(JAUNE, SOMBRE, 0.85), width=largeur, joint='curve')
    # Extrémités arrondies : Pillow ne les gère pas sur line(), on les ajoute à la main.
    for extremite in (ligne[0], ligne[-1]):
        r = largeur / 2
        d.ellipse([extremite[0] - r, extremite[1] - r, extremite[0] + r, extremite[1] + r],
                  fill=melange(JAUNE, SOMBRE, 0.85))

    for centre, rayon, opacite in POINTS:
        cx, cy = pos(centre)
        r = rayon * echelle
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=melange(JAUNE, SOMBRE, opacite))

    return img.resize((taille, taille), Image.LANCZOS)


def main():
    racine = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    fichiers = [
        # (nom, taille, rayon des coins, marge de sécurité)
        ('icone-192.png', 192, 0.22, 0.10),
        ('icone-512.png', 512, 0.22, 0.10),
        # Masquable : fond plein bord à bord, contenu resserré, le système découpe la forme.
        ('icone-masquable-512.png', 512, 0.0, 0.20),
        # iOS n'applique pas de masque et n'aime pas la transparence : coins droits.
        ('apple-touch-icon.png', 180, 0.0, 0.12),
    ]
    for nom, taille, rayon, marge in fichiers:
        img = dessiner(taille, rayon, marge)
        chemin = os.path.join(racine, nom)
        if img.mode == 'RGBA' and nom == 'apple-touch-icon.png':
            fond = Image.new('RGB', img.size, SOMBRE)
            fond.paste(img, mask=img.split()[3])
            img = fond
        img.save(chemin, 'PNG', optimize=True)
        print('  %-28s %4d x %-4d  %5.1f Ko' % (nom, taille, taille, os.path.getsize(chemin) / 1024))


if __name__ == '__main__':
    main()
