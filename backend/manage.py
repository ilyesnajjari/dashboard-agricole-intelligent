#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    # Ensure backup directory exists on startup
    backup_dir = os.path.expanduser('~/Desktop/Backups_Dashboard_Agricole')
    if not os.path.exists(backup_dir):
        try:
            os.makedirs(backup_dir)
            print(f" [Info] Dossier de sauvegarde créé : {backup_dir}")
        except OSError:
            pass

    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
