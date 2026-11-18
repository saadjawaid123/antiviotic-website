#!/usr/bin/env python3
"""Builds the inner pages (privacy, terms, contact, 404) from index.html's header and footer.
Edit the page text below, or the header/footer in index.html, then run:  python3 tools/pages.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
index = (root / "index.html").read_text()

def between(a, b):
    i = index.index(a); return index[i:index.index(b, i)]

head_bits = between('  <link rel="preload"', '  <link rel="stylesheet" href="css/style.css')
chrome = between('  <a class="skip"', '  <main id="main">')
footer = between('  <footer class="footer">', '  <script src="vendor/gsap.min.js"></script>')
fix = lambda h: re.sub(r'href="#', 'href="/#', h).replace('href="/#main"', 'href="#main"')
chrome, footer = fix(chrome), fix(footer)

UPDATED = "18 November 2026"
V = "20261118f"  # bump on every release so browsers load fresh CSS/JS (also in index.html links)
PAGES = {}

PAGES["privacy"] = ("Privacy Policy", "How Antiviotic handles the little data this website collects, and how the app is designed to keep your phone's data on your phone.", f"""
<p class="doc__lead">Short version: this website collects your email only if you join the waitlist or contact us. We do not use ads, trackers or analytics, and we never sell your data.</p>

<h2>Who we are</h2>
<p>Antiviotic is a free security app for Android and iOS that is still in development. "Antiviotic", "we" and "us" mean the team that builds it. You can reach us any time through the <a href="/contact">contact page</a>.</p>

<h2>What this website collects</h2>
<ul>
  <li><b>Waitlist.</b> If you join the waitlist we store your email address, the date you joined, your country (worked out from your connection, not your exact location) and your browser name. We use this only to tell you when Antiviotic launches and to stop spam sign-ups.</li>
  <li><b>Contact form.</b> If you send us a message we store your name, email, message and the same basic details, so we can reply.</li>
  <li><b>Server logs.</b> Our host, Cloudflare, briefly processes technical data such as your IP address to deliver the site and protect it from attacks.</li>
</ul>
<p>That is all. There are no analytics tools, ad pixels, social media plugins or third-party fonts on this site.</p>

<h2>Where it is stored</h2>
<p>Waitlist and contact entries are stored with Cloudflare, which hosts this website. Cloudflare acts as our service provider and may process data in data centres around the world. See <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener">Cloudflare's privacy policy</a>.</p>

<h2>How long we keep it</h2>
<p>We keep your waitlist email until we have sent launch updates, or until you ask us to remove it. Contact messages are kept for as long as we need them to help you, and then deleted.</p>

<h2>Who we share it with</h2>
<p>Nobody, apart from Cloudflare as our host. We do not sell, rent or trade your data, and we never will.</p>

<h2>Your choices</h2>
<p>You can ask us to see, correct or delete the data we hold about you, or take you off the waitlist, at any time. Send a request through the <a href="/contact">contact page</a> from the email address you used, and we will handle it within 30 days. Every launch email will also have a one-click way to unsubscribe.</p>

<h2 id="cookies">Cookies</h2>
<p>This website does not set cookies for tracking, ads or analytics, and it does not use local storage. Cloudflare may set a strictly necessary security cookie to tell people apart from bots. It holds no personal profile and is not used for marketing, so no cookie banner is needed.</p>

<h2>The Antiviotic app</h2>
<p>The app is built so that link and file checks run on your phone. Your messages are not uploaded, read or sold, and the app has no ads. Before the app is released we will add a full section here that lists exactly what the app processes, and the same details will appear on its store listings.</p>

<h2>Children</h2>
<p>This website is not aimed at children under 13, and we do not knowingly collect their data. If you think a child has joined the waitlist, contact us and we will delete the entry.</p>

<h2>Changes</h2>
<p>If we change this policy we will update the date at the top of this page. If the change is important, we will also tell people on the waitlist by email.</p>
""")

PAGES["terms"] = ("Terms of Use", "The terms for using the Antiviotic website and joining the waitlist.", f"""
<p class="doc__lead">By using this website you agree to these terms. They are short and written in plain words. If you do not agree, please do not use the site.</p>

<h2>About this website</h2>
<p>This website tells you about Antiviotic, a phone security app that is still in development, and lets you join a waitlist. App screens shown on the site are design previews and may change before launch.</p>

<h2>The waitlist</h2>
<ul>
  <li>Joining is free and does not create an account or any contract to buy anything.</li>
  <li>Joining does not guarantee early access, a launch date or any particular feature.</li>
  <li>Please use your own email address. We may remove sign-ups that look fake or automated.</li>
</ul>

<h2>Using the site fairly</h2>
<p>Please do not try to break, overload, scrape or attack the site, send spam through its forms, or use it for anything unlawful.</p>

<h2>Our content</h2>
<p>The Antiviotic name, logo, text, graphics, animations and code on this site belong to us. You may share links to the site, but please do not copy or reuse its content or design without our permission.</p>

<h2>No promises about the site</h2>
<p>We work hard to keep the site accurate and online, but it is provided "as is". We cannot promise it will always be available or free of mistakes. Descriptions of the app explain what we are building and are not a guarantee of how it will work on every phone.</p>

<h2>Limits on our responsibility</h2>
<p>As far as the law allows, we are not responsible for any loss that comes from using, or not being able to use, this website. Nothing in these terms limits rights you have under consumer law that cannot be limited.</p>

<h2>Links to other sites</h2>
<p>Some links lead to other websites. We do not control them and are not responsible for their content.</p>

<h2>The app has its own terms</h2>
<p>When the Antiviotic app launches it will come with its own terms of use and privacy details, shown in the app and on its store listings.</p>

<h2>Changes</h2>
<p>We may update these terms. The date at the top of this page shows when they last changed.</p>

<h2>Contact</h2>
<p>Questions about these terms? Write to us through the <a href="/contact">contact page</a>.</p>
""")

PAGES["contact"] = ("Contact", "Get in touch with the Antiviotic team.", """
<p class="doc__lead">Questions, press, partnerships or a privacy request? Send us a message and we will reply by email.</p>
<form class="cform" novalidate>
  <div class="cform__row">
    <label><span>Name</span><input name="name" autocomplete="name" maxlength="120" /></label>
    <label><span>Email</span><input name="email" type="email" autocomplete="email" required /></label>
  </div>
  <label><span>Message</span><textarea name="message" rows="6" maxlength="4000" required></textarea></label>
  <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" />
  <div class="cform__foot">
    <button type="submit" class="pill"><span class="pill__label" data-roll>Send message</span><span class="pill__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></button>
    <p class="cform__msg" role="status" aria-live="polite"></p>
  </div>
  <p class="cform__note">We use your details only to reply. See our <a href="/privacy">Privacy Policy</a>.</p>
</form>
""")

PAGES["404"] = ("Page not found", "This page does not exist.", """
<p class="doc__lead">This page does not exist, or it has moved. Nothing harmful here, we checked.</p>
<p class="doc__actions"><a href="/" class="pill"><span class="pill__label" data-roll>Back to home</span><span class="pill__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></a></p>
""")

for slug, (title, desc, body) in PAGES.items():
    legal = slug in ("privacy", "terms")
    url = "https://antiviotic.com/" + ("" if slug == "404" else slug)
    meta_extra = '  <meta name="robots" content="noindex" />\n' if slug == "404" else f'  <link rel="canonical" href="{url}" />\n'
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} | Antiviotic</title>
  <meta name="description" content="{desc}" />
  <meta name="theme-color" content="#000000" />
  <script>try{{var t=localStorage.getItem("av-theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t;}}catch(e){{document.documentElement.dataset.theme="dark";}}</script>
{meta_extra}  <meta property="og:title" content="{title} | Antiviotic" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="https://antiviotic.com/og.jpg" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="twitter:card" content="summary_large_image" />
{head_bits.replace('  <link rel="stylesheet" href="vendor/lenis.css" />\n', '')}  <link rel="stylesheet" href="/css/style.css?v={V}" />
  <link rel="stylesheet" href="/css/page.css?v={V}" />
</head>
<body data-page="inner">
{chrome.replace('class="nav"', 'class="nav is-inner"', 1)}  <main id="main" class="doc">
    <div class="doc__glow" aria-hidden="true"></div>
    <article class="doc__inner">
      <p class="eyebrow grad">{"Legal" if legal else "Antiviotic"}</p>
      <h1 class="doc__title">{title}</h1>
      {f'<p class="doc__date">Last updated {UPDATED}</p>' if legal else ''}
      {body.strip()}
    </article>
  </main>

{footer}  <script src="/js/common.js?v={V}"></script>
{'  <script>AV.form(document.querySelector(".cform"), "/api/contact", () => "Thanks. Your message is in, and we will reply by email.");</script>' + chr(10) if slug == "contact" else ""}</body>
</html>
"""
    (root / f"{slug}.html").write_text(html)
    print("wrote", slug + ".html")
