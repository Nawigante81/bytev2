# News Refresh Automation

## Setup Instructions

1. Make the script executable:
   ```bash
   chmod +x scripts/refresh-news.sh
   ```

2. Edit the script and update `PROJECT_DIR` to your actual path:
   ```bash
   nano scripts/refresh-news.sh
   # Change: PROJECT_DIR="/var/www/bytev2"
   ```

3. Test the script manually:
   ```bash
   bash scripts/refresh-news.sh
   ```

4. Check logs:
   ```bash
   tail -f logs/cron.log
   tail -f logs/tech-news.log
   tail -f logs/it-news.log
   ```

5. Add to crontab:
   ```bash
   crontab -e
   ```
   
   Add one of these lines:
   ```
   # Hourly refresh
   0 * * * * /var/www/bytev2/scripts/refresh-news.sh
   
   # Every 30 minutes
   */30 * * * * /var/www/bytev2/scripts/refresh-news.sh
   
   # Every 15 minutes (for "live" effect)
   */15 * * * * /var/www/bytev2/scripts/refresh-news.sh
   ```

6. Verify cron is running:
   ```bash
   crontab -l
   sudo tail -f /var/log/syslog | grep CRON
   ```

## Monitoring

Check news freshness: `https://your-domain.com/api/health/news`

Expected response when healthy:
```json
{
  "status": "healthy",
  "tech_news": {
    "age_minutes": 45,
    "updated_at": "2025-12-30T10:00:00.000Z",
    "is_fresh": true
  },
  "it_news": {
    "age_minutes": 50,
    "updated_at": "2025-12-30T09:55:00.000Z",
    "is_fresh": true
  }
}
```
