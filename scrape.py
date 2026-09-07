#!/usr/bin/env python3
"""
Scrape the NYU Bulletin into the course catalogue this planner uses.

The Bulletin runs on CourseLeaf, so every course is one block with a
predictable shape:

    CSCI-UA 421  Numerical Computing  (4 Credits)
    Typically offered Spring
    Prerequisites: (CSCI-UA 102 with a Minimum Grade of C AND
                    MATH-UA 120 with a Minimum Grade of C AND
                    MATH-UA 121 OR MATH-UA 131)

Three things get extracted: the code/name/credits header, the term
availability, and the prerequisite expression. The last one is the
interesting part, because it is a boolean expression over courses and
not a flat list.

    python3 scrape.py                    # default departments
    python3 scrape.py csci_ua math_ua    # specific ones
    python3 scrape.py --all              # every CAS undergraduate dept

Writes catalog.js, which index.html can load in place of the
hand-written COURSES block.
"""

import json
import re
import sys
import time
import urllib.request

BASE = "https://bulletins.nyu.edu/courses/"

# Departments worth having for a CAS degree. Add any slug from
# https://bulletins.nyu.edu/courses/ — the slug is the URL fragment.
DEFAULT_DEPTS = [
    "csci_ua",    # Computer Science
    "math_ua",    # Mathematics
    "econ_ua",    # Economics
    "core_ua",    # College Core Curriculum (Texts and Ideas, etc.)
    "expos_ua",   # Expository Writing
    "fysem_ua",   # First-Year Seminars
]

HEADERS = {"User-Agent": "Mozilla/5.0 (course-planner scraper; personal use)"}

# --------------------------------------------------------------------
# Parsing
# --------------------------------------------------------------------

# "CSCI-UA 421  Numerical Computing  (4 Credits)"
TITLE_RE = re.compile(
    r"^\s*([A-Z]{2,6}-[A-Z]{2,4}\s+\d+[A-Z]?)\s+(.+?)\s+\((\d+(?:\.\d+)?)\s*Credits?\)",
    re.MULTILINE,
)

# "Typically offered Fall, Spring, and Summer terms"
OFFERED_RE = re.compile(r"Typically offered\s*\*?\s*([^*\n\.]+)", re.IGNORECASE)

# "Prerequisites: ..." up to the end of that line
PREREQ_RE = re.compile(
    r"Prerequisites?:\s*(.+?)(?:\n\s*\n|\n\s*(?:Grading|Repeatable|Antirequisites|AD Curriculum|Bulletin Categories)|$)",
    re.IGNORECASE | re.DOTALL,
)

COURSE_CODE_RE = re.compile(r"\b([A-Z]{2,6}-[A-Z]{2,4}\s+\d+[A-Z]?)\b")

TERMS = ("fall", "spring", "summer", "january")


def parse_offered(text):
    """'Fall, Spring, and Summer terms' -> ['fall','spring','summer'].

    'all terms' means every term. Nothing found means unknown, which we
    record as None so it is visibly missing rather than silently wrong.
    """
    m = OFFERED_RE.search(text)
    if not m:
        return None
    blob = m.group(1).lower()
    if "all term" in blob:
        return ["fall", "spring", "summer"]
    found = [t for t in TERMS if t in blob]
    return found or None


def parse_prereqs(text):
    """Turn the prerequisite prose into a list of alternative groups.

    'A AND B AND (C OR D)' becomes [['A'], ['B'], ['C','D']]: an outer
    AND over inner ORs. Any one course from each inner list satisfies
    that clause. This is the shape the planner's gating logic wants.

    It is a heuristic, not a parser for arbitrary boolean logic. Deeply
    nested expressions get flattened, which errs toward listing more
    alternatives rather than fewer. That is the safe direction: an extra
    alternative shows up as a choice, a missing one shows up as a wrong
    plan.
    """
    m = PREREQ_RE.search(text)
    if not m:
        return []
    blob = m.group(1)

    # Drop noise that would otherwise be read as course codes.
    blob = re.sub(r"with a Minimum Grade of [A-F][+-]?", " ", blob, flags=re.I)
    blob = re.sub(r"Advanced Placement Examination[^)]*", " ", blob, flags=re.I)
    blob = re.sub(r"have not taken:.*", " ", blob, flags=re.I | re.DOTALL)

    groups = []
    # Split on AND at the top level, then collect OR alternatives inside.
    for chunk in re.split(r"\bAND\b", blob, flags=re.IGNORECASE):
        codes = [c.strip() for c in COURSE_CODE_RE.findall(chunk)]
        codes = list(dict.fromkeys(codes))  # dedupe, keep order
        if codes:
            groups.append(codes)
    return groups


def split_blocks(html):
    """Split a department page into one text blob per course.

    CourseLeaf wraps each course in a div with class 'courseblock'. We
    strip tags first and split on the title pattern, so the code does
    not depend on exact class names that could change.
    """
    text = re.sub(r"<script.*?</script>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>|</div>|</h\d>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&amp;", "&").replace("&nbsp;", " ")
                .replace("&#160;", " ").replace("&rsquo;", "'")
                .replace("&#8217;", "'").replace("&quot;", '"'))
    text = re.sub(r"[ \t]+", " ", text)

    starts = [m.start() for m in TITLE_RE.finditer(text)]
    for i, s in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(text)
        yield text[s:end]


def parse_department(html):
    out = {}
    for block in split_blocks(html):
        m = TITLE_RE.search(block)
        if not m:
            continue
        code = re.sub(r"\s+", " ", m.group(1)).strip()
        name = re.sub(r"\s+", " ", m.group(2)).strip()
        credits = float(m.group(3))
        out[code] = {
            "name": name,
            "credits": int(credits) if credits == int(credits) else credits,
            "offered": parse_offered(block),
            "prereqGroups": parse_prereqs(block),
        }
    return out


# --------------------------------------------------------------------
# Fetching
# --------------------------------------------------------------------

def fetch(slug):
    url = f"{BASE}{slug}/"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def list_all_departments():
    """Pull every department slug off the Courses A-Z index."""
    html = fetch("")
    return sorted(set(re.findall(r'/courses/([a-z0-9_]+)/', html)))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--all" in sys.argv:
        depts = list_all_departments()
        print(f"Found {len(depts)} departments on the A-Z index")
    else:
        depts = args or DEFAULT_DEPTS

    catalog = {}
    for i, slug in enumerate(depts, 1):
        try:
            courses = parse_department(fetch(slug))
            catalog.update(courses)
            print(f"[{i}/{len(depts)}] {slug}: {len(courses)} courses")
        except Exception as e:
            print(f"[{i}/{len(depts)}] {slug}: FAILED ({e})")
        time.sleep(1)  # be polite to the server

    known = sum(1 for c in catalog.values() if c["offered"])
    withpre = sum(1 for c in catalog.values() if c["prereqGroups"])

    with open("catalog.js", "w") as f:
        f.write("/* Generated by scrape.py from bulletins.nyu.edu.\n")
        f.write("   Do not hand-edit; re-run the scraper instead.\n\n")
        f.write(f"   {len(catalog)} courses, {known} with known term offerings,\n")
        f.write(f"   {withpre} with prerequisites.\n\n")
        f.write("   prereqGroups is an AND of ORs: [['A'],['B','C']] means\n")
        f.write("   A is required, and either B or C. offered:null means the\n")
        f.write("   Bulletin did not state a term, not that it is never offered. */\n\n")
        f.write("const SCRAPED_CATALOG = ")
        f.write(json.dumps(catalog, indent=1, sort_keys=True))
        f.write(";\n")

    print(f"\nWrote catalog.js: {len(catalog)} courses")
    print(f"  {known} with term offerings, {withpre} with prerequisites")


if __name__ == "__main__":
    main()
