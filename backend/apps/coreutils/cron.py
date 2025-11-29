"""
Cron jobs for scheduled tasks
"""
from apps.coreutils.backup_service import create_weekly_backup
import logging

logger = logging.getLogger(__name__)


def weekly_backup_job():
    """
    Create a local backup every Sunday at 9:00 AM
    Replaces the email-based backup system
    """
    logger.info("Starting weekly backup job...")
    success, result = create_weekly_backup()
    
    if success:
        logger.info(f"Weekly backup completed successfully: {result}")
    else:
        logger.error(f"Weekly backup failed: {result}")
    
    return success
