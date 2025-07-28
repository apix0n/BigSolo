import os
import sys

def generer_resume_repertoire(chemin_racine, fichier_sortie, fichiers_a_ignorer, extensions_a_ignorer, dossiers_a_ignorer):
    """
    Parcourt un répertoire de manière récursive et écrit sa structure ainsi que
    le contenu de chaque fichier, en ignorant certains éléments.

    :param chemin_racine: Le chemin du répertoire à analyser.
    :param fichier_sortie: Le nom du fichier texte où enregistrer le résumé.
    :param fichiers_a_ignorer: Une liste de noms de fichiers à ignorer.
    :param extensions_a_ignorer: Un tuple d'extensions de fichiers à ignorer.
    :param dossiers_a_ignorer: Une liste de noms de dossiers à ignorer.
    """
    try:
        with open(fichier_sortie, 'w', encoding='utf-8') as f_out:
            print(f"Analyse du répertoire : {chemin_racine}")
            f_out.write(f"Résumé du projet : {chemin_racine}\n")
            f_out.write("=" * (len(chemin_racine) + 20) + "\n\n")

            if not os.path.isdir(chemin_racine):
                message_erreur = f"ERREUR : Le chemin '{chemin_racine}' n'est pas un répertoire valide."
                print(message_erreur)
                f_out.write(message_erreur)
                return

            for dossier_actuel, sous_dossiers, fichiers in os.walk(chemin_racine):
                # --- MODIFICATION CLÉ ---
                # Exclut les dossiers spécifiés.
                # On modifie la liste `sous_dossiers` en place pour que os.walk
                # ne les parcoure pas du tout. C'est très efficace.
                sous_dossiers[:] = [d for d in sous_dossiers if d not in dossiers_a_ignorer]

                profondeur = dossier_actuel.replace(chemin_racine, '').count(os.sep)
                indentation = ' ' * 4 * profondeur

                nom_dossier = os.path.basename(dossier_actuel)
                f_out.write(f"{indentation}Dossier : {nom_dossier}/\n")
                print(f"  -> Dans le dossier : {nom_dossier}/")

                indentation_fichier = ' ' * 4 * (profondeur + 1)
                
                # Trie les fichiers pour un ordre cohérent
                fichiers.sort()

                for nom_fichier in fichiers:
                    if nom_fichier in fichiers_a_ignorer:
                        continue

                    if nom_fichier.lower().endswith(extensions_a_ignorer):
                        continue

                    chemin_complet_fichier = os.path.join(dossier_actuel, nom_fichier)
                    
                    f_out.write(f"\n{indentation_fichier}Fichier : {nom_fichier}\n")
                    f_out.write(f"{indentation_fichier}{'-' * (len(nom_fichier) + 10)}\n")
                    
                    try:
                        with open(chemin_complet_fichier, 'r', encoding='utf-8', errors='ignore') as f_in:
                            contenu = f_in.read()
                            for ligne in contenu.splitlines():
                                f_out.write(f"{indentation_fichier}  {ligne}\n")
                    except Exception as e:
                        f_out.write(f"{indentation_fichier}  --> ERREUR : Impossible de lire le contenu. Raison : {e}\n")
                    
                    f_out.write(f"{indentation_fichier}{'-' * (len(nom_fichier) + 10)}\n\n")

        print(f"\nRésumé terminé ! Le fichier '{fichier_sortie}' a été créé avec succès.")

    except Exception as e:
        print(f"Une erreur inattendue est survenue : {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Utilisation : py summary.py <chemin_vers_le_dossier>")
        sys.exit(1)
    
    chemin_du_projet = sys.argv[1]
    nom_du_fichier_resume = "summary.txt"
    
    # Listes d'éléments à ignorer
    fichiers_ignores = [nom_du_fichier_resume, "summary.py"]
    extensions_ignorees = ('.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp')
    
    # --- AJOUT IMPORTANT ---
    # Liste des dossiers à ignorer complètement
    dossiers_ignores = ['.git', '__pycache__', 'node_modules', 'venv', '.vscode']
    
    # Appelle la fonction principale pour générer le résumé
    generer_resume_repertoire(chemin_du_projet, nom_du_fichier_resume, fichiers_ignores, extensions_ignorees, dossiers_ignores)