# Image Scraper

A Python CLI tool that searches for images by keyword, downloads them, and optionally stores metadata in a SQLite database. Uses **Playwright** for headless browser automation (handles JavaScript-rendered content) and **BeautifulSoup** for HTML parsing.

## Setup

```bash
# 1. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate   # macOS/Linux
# venv\Scripts\activate    # Windows

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install Playwright browser binaries
playwright install chromium
```

## Configuration

Edit `.env` to adjust settings:

| Variable          | Default              | Description                        |
|-------------------|----------------------|------------------------------------|
| `MAX_IMAGES`      | `20`                 | Max images to scrape per search    |
| `REQUEST_TIMEOUT` | `30`                 | Network timeout in seconds         |
| `DOWNLOAD_DIR`    | `downloads`          | Base folder for saved images       |
| `DB_PATH`         | `image_scraper.db`   | SQLite database file path          |
| `USER_AGENT`      | Chrome UA string     | Browser user-agent header          |

## Usage

### Interactive mode

```bash
python main.py
```

You will be prompted for a keyword and a storage mode:
- **A** — Save images locally to `downloads/<keyword>/`
- **B** — Store metadata (URL, timestamp, keyword) in SQLite
- **C** — Both

### Command-line mode

```bash
python main.py --keyword "mountain landscape" --mode both
python main.py -k "cats" -m local
python main.py -k "sunset" -m database
```

## Project Structure

```
main.py            Entry point and CLI interface
scraper.py         Playwright + BeautifulSoup image scraper
storage.py         Local file storage and SQLite metadata
.env               Configuration settings
requirements.txt   Python dependencies
```

## Storage Design

Images are saved to **disk** (not as database BLOBs). The SQLite database stores only lightweight metadata: image URL, local file path, keyword, and timestamp.
