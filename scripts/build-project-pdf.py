from pathlib import Path
from textwrap import wrap

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "pickme-project-description.pdf"
LOGO = ROOT / "public" / "brand" / "pickme-logo.png"

PAGE_W, PAGE_H = landscape(A4)
NAVY = HexColor("#081225")
NAVY_2 = HexColor("#0D1B31")
PANEL = HexColor("#12233E")
PANEL_2 = HexColor("#102039")
INK = HexColor("#F8FAFC")
MUTED = HexColor("#AAB7CC")
INDIGO = HexColor("#6366F1")
BLUE = HexColor("#3B82F6")
CYAN = HexColor("#22D3EE")
GREEN = HexColor("#34D399")
AMBER = HexColor("#FBBF24")
RED = HexColor("#FB7185")
LINE = Color(1, 1, 1, alpha=0.12)


def fit_lines(text, font, size, width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_text(c, text, x, y, width, size=11, leading=15, color=MUTED, font="Helvetica", max_lines=None):
    c.setFont(font, size)
    c.setFillColor(color)
    lines = fit_lines(text, font, size, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(c, items, x, y, width, size=10.4, leading=14.2, color=MUTED, gap=7):
    for item in items:
        c.setFillColor(CYAN)
        c.circle(x + 3, y + 3, 2.2, stroke=0, fill=1)
        y = draw_text(c, item, x + 13, y, width - 13, size, leading, color, max_lines=3)
        y -= gap
    return y


def card(c, x, y, w, h, fill=PANEL, stroke=LINE, radius=14):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.7)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)


def label(c, text, x, y, color=CYAN):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8.6)
    c.drawString(x, y, text.upper())


def title(c, text, x, y, width, size=29):
    return draw_text(c, text, x, y, width, size=size, leading=size * 1.02, color=INK, font="Helvetica-Bold")


def page_base(c, page_number, section):
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(Color(0.39, 0.40, 0.95, alpha=0.12))
    c.circle(PAGE_W - 28, PAGE_H + 20, 160, stroke=0, fill=1)
    c.setFillColor(Color(0.13, 0.83, 0.93, alpha=0.06))
    c.circle(12, -15, 125, stroke=0, fill=1)
    c.setStrokeColor(LINE)
    c.line(42, 35, PAGE_W - 42, 35)
    if LOGO.exists():
        c.drawImage(ImageReader(str(LOGO)), 42, 11, width=24, height=24, mask="auto", preserveAspectRatio=True)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(73, 20, "PICKME  /  AI PRODUCT VISIBILITY LAB")
    c.drawRightString(PAGE_W - 42, 20, f"{section.upper()}   {page_number}/3")


def metric_chip(c, x, y, w, number, caption, color):
    card(c, x, y, w, 68, fill=NAVY_2)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 23)
    c.drawString(x + 16, y + 33, number)
    draw_text(c, caption, x + 16, y + 18, w - 32, size=8.5, leading=10, color=MUTED, font="Helvetica-Bold", max_lines=2)


def page_one(c):
    page_base(c, 1, "Problem and solution")
    x = 48
    if LOGO.exists():
        c.drawImage(ImageReader(str(LOGO)), x, PAGE_H - 105, width=62, height=62, mask="auto", preserveAspectRatio=True)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 25)
    c.drawString(x + 75, PAGE_H - 71, "PickMe")
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(x + 76, PAGE_H - 88, "AI PRODUCT VISIBILITY LAB")

    title(c, "Will an AI shopping agent pick your product?", x, PAGE_H - 140, 720, size=32)
    draw_text(
        c,
        "PickMe crash-tests how shopping agents discover, understand and rank ecommerce products, then helps merchants improve verified evidence and replay the same test.",
        x,
        PAGE_H - 188,
        700,
        size=13.5,
        leading=18,
        color=HexColor("#D9E4F5"),
        max_lines=3,
    )

    left_x, right_x = 48, 430
    top_y, card_h = 155, 210
    card(c, left_x, top_y, 360, card_h)
    label(c, "Problem", left_x + 20, top_y + card_h - 27, RED)
    draw_text(c, "A suitable product can disappear before recommendation.", left_x + 20, top_y + card_h - 57, 316, 16, 20, INK, "Helvetica-Bold", 2)
    draw_bullets(
        c,
        [
            "Shoppers use vague, contextual and colloquial language instead of exact keywords.",
            "Agents must retrieve, verify and compare evidence before recommending.",
            "Merchants see the outcome, but not where the agent lost confidence or why a clearer competitor won.",
        ],
        left_x + 20,
        top_y + card_h - 104,
        316,
    )

    card(c, right_x, top_y, 364, card_h)
    label(c, "Solution", right_x + 20, top_y + card_h - 27, GREEN)
    draw_text(c, "Make the recommendation journey observable and repeatable.", right_x + 20, top_y + card_h - 57, 320, 16, 20, INK, "Helvetica-Bold", 2)
    draw_bullets(
        c,
        [
            "Submit a Shopwise product URL and natural buyer intent.",
            "Retrieve Amazon Fashion competitors and build an evidence shortlist.",
            "Run discovery and 100 human-style cases in parallel.",
            "Diagnose rank, metadata gaps and competitor advantages.",
            "Edit supported facts and replay the exact same suite.",
        ],
        right_x + 20,
        top_y + card_h - 104,
        320,
        size=9.5,
        leading=12.6,
        gap=4,
    )

    chip_y, chip_w, gap = 72, 175, 12
    metric_chip(c, 48, chip_y, chip_w, "100", "controlled shopper cases", CYAN)
    metric_chip(c, 48 + chip_w + gap, chip_y, chip_w, "5,000", "deployable Fashion products", BLUE)
    metric_chip(c, 48 + (chip_w + gap) * 2, chip_y, chip_w, "7", "auditable discovery steps", AMBER)
    metric_chip(c, 48 + (chip_w + gap) * 3, chip_y, chip_w, "4", "evidence-based score dimensions", GREEN)
    c.showPage()


def page_two(c):
    page_base(c, 2, "Product and features")
    label(c, "How it works", 48, PAGE_H - 55)
    title(c, "One continuous test, diagnosis and improvement loop", 48, PAGE_H - 86, 730, size=28)

    stages = [
        ("1", "Submit", "Product URL + buyer intent"),
        ("2", "Retrieve", "FTS5 catalog search"),
        ("3", "Split", "Terra + four Luna batches"),
        ("4", "Diagnose", "Rank, evidence and fixes"),
        ("5", "Replay", "Same 100 cases after edit"),
    ]
    stage_y, stage_w, stage_gap = 405, 140, 14
    for i, (num, name, desc) in enumerate(stages):
        sx = 48 + i * (stage_w + stage_gap)
        card(c, sx, stage_y, stage_w, 88, fill=NAVY_2)
        c.setFillColor(CYAN)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(sx + 14, stage_y + 64, num)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(sx + 14, stage_y + 43, name)
        draw_text(c, desc, sx + 14, stage_y + 25, stage_w - 28, 8.6, 10.5, MUTED, max_lines=2)
        if i < len(stages) - 1:
            c.setStrokeColor(CYAN)
            c.setLineWidth(1.2)
            c.line(sx + stage_w + 3, stage_y + 44, sx + stage_w + stage_gap - 3, stage_y + 44)

    label(c, "Key features", 48, 375, BLUE)
    features = [
        ("Adversarial coverage", "100 messages across simple chat, Singlish, shorthand, constraints, ambiguity and context shifts."),
        ("Live agent activity", "Streams safe reasoning summaries, actions, inspected evidence, structure validation and batch progress."),
        ("Discovery trace", "Seven checkpoints show known needs, missing information, searches, evidence and rank movement."),
        ("Product leaderboard", "Compares the target with the strongest evidence candidates and explains competitor effects."),
        ("Metadata editor", "Shows a red/green diff and product-page preview while preserving verified facts."),
        ("Controlled validation", "Reuses the exact prompts and compares score, primary rank and Top-5 coverage."),
    ]
    fw, fh = 244, 118
    for i, (name, desc) in enumerate(features):
        col, row = i % 3, i // 3
        fx = 48 + col * (fw + 16)
        fy = 238 - row * (fh + 14)
        card(c, fx, fy, fw, fh, fill=PANEL_2)
        c.setFillColor([CYAN, BLUE, AMBER, GREEN, INDIGO, CYAN][i])
        c.circle(fx + 21, fy + fh - 24, 4, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12.2)
        c.drawString(fx + 34, fy + fh - 29, name)
        draw_text(c, desc, fx + 16, fy + fh - 53, fw - 32, 9.2, 12.2, MUTED, max_lines=5)

    c.showPage()


def page_three(c):
    page_base(c, 3, "Architecture and potential")
    label(c, "Implementation", 48, PAGE_H - 55)
    title(c, "Deployable today, extensible to production catalogs", 48, PAGE_H - 86, 730, size=28)

    arch_y = 370
    nodes = [
        (48, 148, "Merchant UI", "Next.js + React"),
        (220, 170, "Evaluation API", "Streaming NDJSON"),
        (414, 170, "Parallel agents", "Terra + Luna"),
        (608, 180, "Catalog evidence", "SQLite FTS5 / remote"),
    ]
    for i, (nx, nw, name, tech) in enumerate(nodes):
        card(c, nx, arch_y, nw, 78, fill=NAVY_2)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(nx + nw / 2, arch_y + 46, name)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9)
        c.drawCentredString(nx + nw / 2, arch_y + 25, tech)
        if i < len(nodes) - 1:
            x1 = nx + nw
            x2 = nodes[i + 1][0]
            c.setStrokeColor(CYAN)
            c.setLineWidth(1.2)
            c.line(x1 + 5, arch_y + 39, x2 - 5, arch_y + 39)

    metric_chip(c, 48, 280, 176, "5.9 MB", "bundled demo database", CYAN)
    metric_chip(c, 236, 280, 176, "826,050", "records in full local index", BLUE)
    metric_chip(c, 424, 280, 176, "25", "evidence candidates reranked", AMBER)
    metric_chip(c, 612, 280, 176, "Local", "browser run history and drafts", GREEN)

    card(c, 48, 74, 360, 180)
    label(c, "Real-world applicability", 67, 228, GREEN)
    draw_bullets(
        c,
        [
            "Pre-publish QA for Shopify, marketplace or merchant product feeds.",
            "Regression testing when product data or shopping-agent models change.",
            "Evidence-gap analysis across a brand's catalog and competitors.",
            "Controlled experiments for titles, features, details and use-case language.",
            "A defensible audit trail for why an agent recommended or rejected a product.",
        ],
        67,
        202,
        320,
        size=9.6,
        leading=12.8,
        gap=5,
    )

    card(c, 430, 74, 358, 180)
    label(c, "Future potential", 449, 228, BLUE)
    draw_bullets(
        c,
        [
            "Authenticated merchant workspaces and durable shared run history.",
            "Shopify and product-feed ingestion with full-catalog hosted retrieval.",
            "Multi-model and multi-provider recommendation benchmarking.",
            "Confidence intervals and repeated trials for ranking stability.",
            "Evidence approval workflows and multimodal product-image evaluation.",
        ],
        449,
        202,
        318,
        size=9.6,
        leading=12.8,
        gap=5,
    )

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13.5)
    c.drawCentredString(PAGE_W / 2, 53, "PickMe turns AI product recommendations into something merchants can test, explain and improve.")
    c.showPage()


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    c.setTitle("PickMe - Project Description")
    c.setAuthor("PickMe")
    c.setSubject("AI Product Visibility Lab project overview")
    page_one(c)
    page_two(c)
    page_three(c)
    c.save()
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    build()
