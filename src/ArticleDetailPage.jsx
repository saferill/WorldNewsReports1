import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Clock, Globe, Loader, Languages, Search, Copy, Check, Bookmark } from "lucide-react";
import { f, uiStrings } from "./shared/theme";
import { formatFullDate, formatTime, getCachedArticle, getCachedArticles, fetchArticleContent, translateText, translateHtml, estimateReadingTime, trackArticleRead } from "./shared/utils";
import { useTheme } from "./shared/ThemeContext";
import { useBookmarks } from "./shared/useBookmarks";

// ─── Social share icons (inline SVG) ───
function XLogo() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.738-8.854L2.032 2.25H8.2l4.259 5.632 5.785-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
}
function LinkedInLogo() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
}
function FacebookLogo() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
}

// ─── Share bar ───
function ShareBar({ article, theme }) {
  const [copied, setCopied] = useState(false);
  const url        = article.link;
  const shareUrl   = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(article.title);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  const socialLinks = [
    { label: "X",        icon: <XLogo />,        href: `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}` },
    { label: "LinkedIn", icon: <LinkedInLogo />,  href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}` },
    { label: "Facebook", icon: <FacebookLogo />,  href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` },
  ];

  const btnBase = {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "6px 13px", border: `1px solid ${theme.border}`,
    background: "transparent", textDecoration: "none",
    fontFamily: f.sans, fontSize: 11, fontWeight: 500,
    color: theme.dim, transition: "all 0.15s ease-out", cursor: "pointer",
  };

  return (
    <div style={{ margin: "28px 0 8px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{
        fontFamily: f.sans, fontSize: 9, fontWeight: 600,
        color: theme.rule, letterSpacing: 1.8, textTransform: "uppercase",
      }}>Share</span>
      {socialLinks.map(({ label, icon, href }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer"
          style={btnBase}
          onMouseEnter={e => { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; }}
          aria-label={`Share on ${label}`}
        >
          {icon} {label}
        </a>
      ))}
      <button onClick={handleCopy}
        style={{
          ...btnBase,
          border: `1px solid ${copied ? theme.accent : theme.border}`,
          background: copied ? theme.accentSoft : "transparent",
          color: copied ? theme.accent : theme.dim,
        }}
        onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; } }}
        onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; } }}
        aria-label="Copy article link"
      >
        {copied ? <Check size={10} strokeWidth={2} /> : <Copy size={10} strokeWidth={1.5} />}
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

// ─── Reading Progress Bar ───
function ReadingProgress({ theme }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) { setProgress(0); return; }
      setProgress(Math.min((window.scrollY / docHeight) * 100, 100));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: 3,
      zIndex: 100, background: "transparent",
    }}>
      <div style={{
        height: "100%", width: `${progress}%`,
        background: theme.accent,
        transition: "width 0.1s linear",
      }} />
    </div>
  );
}

// ─── Content Loading Skeleton ───
function ContentSkeleton({ theme }) {
  const lines = [
    // paragraph 1
    { w: 100, mb: 12 }, { w: 95, mb: 12 }, { w: 88, mb: 12 }, { w: 72, mb: 28 },
    // paragraph 2
    { w: 98, mb: 12 }, { w: 84, mb: 12 }, { w: 92, mb: 12 }, { w: 60, mb: 28 },
    // paragraph 3
    { w: 96, mb: 12 }, { w: 78, mb: 12 }, { w: 45, mb: 0 },
  ];
  return (
    <div style={{ padding: "8px 0" }} aria-busy="true" aria-label="Loading article content">
      {lines.map((l, i) => (
        <div key={i} style={{
          height: 16, borderRadius: 3, marginBottom: l.mb,
          width: `${l.w}%`,
          background: `linear-gradient(90deg, ${theme.skeleton} 0%, ${theme.skeleton}66 50%, ${theme.skeleton} 100%)`,
          backgroundSize: "600px 100%",
          animation: `fadeIn 0.35s ${i * 0.04}s ease-out both, shimmerSlide 2s ${i * 0.06}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Slim Header ───
function SlimHeader({ t, theme }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 0", borderBottom: `1px solid ${theme.ink}`,
    }}>
      <Link to="/" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: f.sans, fontSize: 12, fontWeight: 500,
        color: theme.dim, textDecoration: "none",
        transition: "color 0.15s ease-out",
      }}
        onMouseEnter={e => e.currentTarget.style.color = theme.ink}
        onMouseLeave={e => e.currentTarget.style.color = theme.dim}>
        <ArrowLeft size={14} strokeWidth={1.5} /> {t.backToFeed}
      </Link>
      <Link to="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Globe size={16} strokeWidth={1.3} color={theme.ink} />
        <span style={{ fontFamily: f.display, fontSize: 18, color: theme.ink }}>World News Reports</span>
      </Link>
    </div>
  );
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const lang = new URLSearchParams(location.search).get("lang") || sessionStorage.getItem("atlas-lang") || "en";
  const t = { ...uiStrings.en, ...(uiStrings[lang] || {}) };

  const article = location.state?.article || getCachedArticle(id);
  const { toggle: toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = article ? isBookmarked(article.id) : false;

  // Track this read for the "articles read today" counter
  useEffect(() => {
    if (article) trackArticleRead();
  }, [article?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [content, setContent] = useState({ status: "idle", data: null });
  const [showTranslated, setShowTranslated] = useState(lang !== "en");
  const [translatedTitle, setTranslatedTitle] = useState(null);
  const [translatedContent, setTranslatedContent] = useState(null);
  const [translatedDesc, setTranslatedDesc] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Scroll to top on every article navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  // Keyboard: Escape goes back
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && e.target.tagName !== "INPUT") {
        navigate("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  // Fetch full article content
  useEffect(() => {
    if (!article?.link || article.link === "#") return;
    let cancelled = false;

    setContent({ status: "loading", data: null }); // eslint-disable-line react-hooks/set-state-in-effect
    fetchArticleContent(article.link)
      .then(result => { if (!cancelled) setContent({ status: "done", data: result }); })
      .catch(() => { if (!cancelled) setContent({ status: "error", data: null }); });

    return () => { cancelled = true; };
  }, [article?.link]);

  const fullContent = content.data;
  const contentLoading = content.status === "loading";
  const contentError = content.status === "error";

  // Translate article
  useEffect(() => {
    if (lang === "en" || !showTranslated) {
      setTranslatedTitle(null); // eslint-disable-line react-hooks/set-state-in-effect
      setTranslatedContent(null);
      setTranslatedDesc(null);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    (async () => {
      if (article?.title) {
        const trTitle = await translateText(article.title, lang);
        if (!cancelled) setTranslatedTitle(trTitle);
      }
      if (article?.description) {
        const trDesc = await translateText(article.description, lang);
        if (!cancelled) setTranslatedDesc(trDesc);
      }
      if (fullContent?.content) {
        const trHtml = await translateHtml(fullContent.content, lang);
        if (!cancelled) setTranslatedContent(trHtml);
      }
      if (!cancelled) setIsTranslating(false);
    })();

    return () => { cancelled = true; };
  }, [lang, showTranslated, article?.title, article?.description, fullContent?.content]);

  // Related articles from same source
  const relatedArticles = useMemo(() => {
    if (!article) return [];
    const cached = getCachedArticles();
    return Object.values(cached)
      .filter(a => a.source === article.source && a.id !== article.id)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 3);
  }, [article]);

  const hostname = useMemo(() => {
    if (!article) return "";
    try { return new URL(article.link).hostname.replace("www.", ""); } catch { return article.source; }
  }, [article]);

  // ─── Not Found / Direct Link State ───
  if (!article) {
    return (
      <div style={{ background: theme.bg, minHeight: "100vh", fontFamily: f.body, transition: "background 0.3s ease" }}>
        <div className="article-page-container" style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
          <SlimHeader t={t} theme={theme} />
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <Globe size={48} strokeWidth={0.8} color={theme.rule} style={{ marginBottom: 24 }} />
            <h1 style={{
              fontFamily: f.display, fontSize: 28, fontWeight: 400,
              color: theme.ink, marginBottom: 12,
            }}>{t.articleNotFound}</h1>
            <p style={{
              fontFamily: f.body, fontSize: 15, color: theme.dim,
              fontStyle: "normal", marginBottom: 12, maxWidth: 400, margin: "0 auto 32px",
              lineHeight: 1.6,
            }}>{t.articleExpired}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", background: theme.ink, color: theme.bg,
                fontFamily: f.sans, fontSize: 13, fontWeight: 600,
                textDecoration: "none", letterSpacing: 0.3, transition: "opacity 0.15s ease-out",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                <Search size={14} strokeWidth={2} /> {t.returnHome}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Article Detail ───
  return (
    <div style={{ background: theme.bg, minHeight: "100vh", fontFamily: f.body, transition: "background 0.3s ease" }}>
      <ReadingProgress theme={theme} />

      <div className="article-page-container" style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        <SlimHeader t={t} theme={theme} />

        {/* ─── Article Meta ─── */}
        <div style={{ padding: "32px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: f.sans, fontSize: 11, fontWeight: 600, color: theme.dim,
              textTransform: "uppercase", letterSpacing: 1.5,
            }}>{article.source}</span>
            {fullContent?.byline && (
              <>
                <span style={{ color: theme.rule }} aria-hidden="true">·</span>
                <span style={{
                  fontFamily: f.sans, fontSize: 11, color: theme.dim, fontWeight: 500,
                }}>{fullContent.byline}</span>
              </>
            )}
            {article.pubDate && (
              <>
                <span style={{ color: theme.rule }} aria-hidden="true">·</span>
                <time dateTime={new Date(article.pubDate).toISOString()} style={{
                  fontFamily: f.sans, fontSize: 11, color: theme.dim, fontWeight: 500,
                }}>{formatFullDate(article.pubDate)}</time>
              </>
            )}
            {/* Reading time — computed from full content once loaded, else from description */}
            {(() => {
              const text = fullContent?.content || article.description || "";
              const mins = estimateReadingTime(text);
              return (
                <>
                  <span style={{ color: theme.rule }} aria-hidden="true">·</span>
                  <span style={{
                    fontFamily: f.sans, fontSize: 11, color: theme.dim, fontWeight: 500,
                    display: "inline-flex", alignItems: "center", gap: 3,
                  }}>
                    <Clock size={10} strokeWidth={1.5} />
                    {mins} min read
                  </span>
                </>
              );
            })()}
          </div>

          {/* Category tags */}
          {article.categories?.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {article.categories.map(cat => (
                <span key={cat} style={{
                  fontFamily: f.sans, fontSize: 10, fontWeight: 500,
                  color: theme.accent, letterSpacing: 0.3,
                  padding: "3px 8px", background: theme.accentSoft,
                  borderRadius: 2, textTransform: "lowercase",
                }}>{cat}</span>
              ))}
            </div>
          )}

          {/* ─── Title + bookmark ─── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <h1 style={{
              fontFamily: f.display, fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 400,
              color: theme.ink, lineHeight: 1.25, letterSpacing: -0.5, flex: 1,
            }}>{showTranslated && translatedTitle ? translatedTitle : article.title}</h1>
            <button
              onClick={() => toggleBookmark(article)}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark this article"}
              title={bookmarked ? "Remove bookmark" : "Save for later"}
              style={{
                flexShrink: 0, marginTop: 6,
                background: "none", border: `1px solid ${bookmarked ? theme.accent : theme.border}`,
                padding: "6px 8px", cursor: "pointer",
                color: bookmarked ? theme.accent : theme.dim,
                transition: "all 0.15s ease-out",
                display: "flex", alignItems: "center",
              }}
              onMouseEnter={e => { if (!bookmarked) { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; } }}
              onMouseLeave={e => { if (!bookmarked) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; } }}
            >
              <Bookmark size={14} strokeWidth={1.5} fill={bookmarked ? theme.accent : "none"} />
            </button>
          </div>

          {/* ─── Translate Toggle ─── */}
          {lang !== "en" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
              <button
                onClick={() => setShowTranslated(v => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", border: `1px solid ${theme.border}`,
                  background: showTranslated ? theme.surface : "transparent",
                  cursor: "pointer", fontFamily: f.sans, fontSize: 11,
                  fontWeight: 500, color: theme.dim, transition: "all 0.15s ease-out",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; }}>
                <Languages size={12} strokeWidth={1.5} />
                {showTranslated ? (t.showOriginal || "Original") : (t.translateArticle || "Translate article")}
              </button>
              {isTranslating && (
                <span style={{
                  fontFamily: f.sans, fontSize: 11, color: theme.accent,
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  <Loader size={11} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
                  {t.translating || "Translating…"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── Hero Image ─── */}
        {article.image && (
          <div style={{
            width: "100%", aspectRatio: "16 / 9", maxHeight: 400, overflow: "hidden",
            background: theme.surface, marginBottom: 32, borderRadius: 3,
          }}>
            <img src={article.image} alt=""
              style={{
                width: "100%", height: "100%", objectFit: "cover", display: "block",
                filter: "saturate(0.7) contrast(1.05)",
              }}
              onError={e => { e.target.parentElement.style.display = "none"; }} />
          </div>
        )}

        {/* ─── Full Article Content ─── */}
        {contentLoading ? (
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
              padding: "12px 16px", background: theme.surface, borderRadius: 3,
            }}>
              <Loader size={14} strokeWidth={1.5} color={theme.dim} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontFamily: f.sans, fontSize: 12, color: theme.dim, fontWeight: 500 }}>
                {t.loadingArticle} {hostname}...
              </span>
            </div>
            <ContentSkeleton theme={theme} />
          </div>
        ) : fullContent ? (
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: showTranslated && translatedContent ? translatedContent : fullContent.content }}
            style={{
              fontFamily: f.body, fontSize: 17, color: theme.text,
              lineHeight: 1.8, marginBottom: 36,
            }}
          />
        ) : (
          article.description && (
            <div>
              {contentError && (
                <div style={{
                  padding: "10px 16px", background: theme.accentSoft, marginBottom: 20,
                  display: "flex", alignItems: "center", gap: 8,
                }} role="status">
                  <span style={{ fontFamily: f.sans, fontSize: 12, color: theme.accent, fontWeight: 500 }}>
                    {t.contentFallback}
                  </span>
                </div>
              )}
              <p style={{
                fontFamily: f.body, fontSize: 17, color: theme.text,
                lineHeight: 1.8, marginBottom: 36,
              }}>{showTranslated && translatedDesc ? translatedDesc : article.description}</p>
            </div>
          )
        )}

        {/* ─── Source Attribution ─── */}
        <div style={{
          padding: "16px 20px", background: theme.surface, marginBottom: 24,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Globe size={13} strokeWidth={1.5} color={theme.dim} />
          <span style={{ fontFamily: f.sans, fontSize: 12, color: theme.dim }}>
            {t.publishedOn} <strong style={{ color: theme.text, fontWeight: 600 }}>{hostname}</strong>
          </span>
        </div>

        {/* ─── CTA Button ─── */}
        <a href={article.link} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", padding: "16px 24px", background: theme.ink, color: theme.bg,
          fontFamily: f.sans, fontSize: 14, fontWeight: 600,
          textDecoration: "none", transition: "opacity 0.15s ease-out",
          letterSpacing: 0.3,
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          {t.readFull} {hostname} <ArrowUpRight size={16} strokeWidth={2} />
        </a>

        {/* ─── Share bar ─── */}
        <ShareBar article={article} theme={theme} />

        {/* ─── Related Articles ─── */}
        {relatedArticles.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <div style={{
              borderTop: `1px solid ${theme.rule}`, paddingTop: 24, marginBottom: 16,
            }}>
              <h2 style={{
                fontFamily: f.sans, fontSize: 11, fontWeight: 600, color: theme.dim,
                textTransform: "uppercase", letterSpacing: 1.5,
              }}>{t.moreFrom} {article.source}</h2>
            </div>

            {relatedArticles.map(related => (
              <Link
                key={related.id}
                to={`/article/${related.id}`}
                state={{ article: related }}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{
                  padding: "14px 0",
                  borderBottom: `1px solid ${theme.border}`,
                  transition: "opacity 0.15s ease-out",
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                  <h3 style={{
                    fontFamily: f.display, fontSize: 16, fontWeight: 400,
                    color: theme.ink, lineHeight: 1.35, marginBottom: 4,
                  }}>{related.title}</h3>
                  {related.pubDate && (
                    <span style={{
                      fontFamily: f.sans, fontSize: 10, color: theme.dim,
                      display: "inline-flex", alignItems: "center", gap: 3,
                    }}>
                      <Clock size={9} strokeWidth={1.5} /> {formatTime(related.pubDate)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </section>
        )}

        {/* ─── Keyboard hint ─── */}
        <div style={{
          textAlign: "center", padding: "24px 0 8px",
          fontFamily: f.sans, fontSize: 10, color: theme.rule,
        }}>
          <kbd style={{ padding: "1px 4px", background: theme.surface, borderRadius: 2, fontSize: 9 }}>Esc</kbd>
          {" back to feed"}
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: `1px solid ${theme.border}`, padding: "16px 24px", marginTop: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: f.display, fontSize: 15, color: theme.ink, display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={14} strokeWidth={1.3} color={theme.ink} />
            World News Reports
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="https://instagram.com/safe_rill" target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: f.sans, fontSize: 10, color: theme.dim, fontWeight: 500, textDecoration: "none", transition: "color 0.15s ease-out", display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = theme.accent}
              onMouseLeave={e => e.currentTarget.style.color = theme.dim}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Instagram
            </a>
            <a href="https://tiktok.com/@safe_rill" target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: f.sans, fontSize: 10, color: theme.dim, fontWeight: 500, textDecoration: "none", transition: "color 0.15s ease-out" }}
              onMouseEnter={e => e.currentTarget.style.color = theme.ink}
              onMouseLeave={e => e.currentTarget.style.color = theme.dim}>
              Tiktok RYC
            </a>
          </div>
        </div>
      </footer>

      {/* ─── Article Content Styles ─── */}
      <style>{`
        .article-content p {
          margin-bottom: 1.4em;
        }
        .article-content h2,
        .article-content h3,
        .article-content h4 {
          font-family: ${f.display};
          font-weight: 400;
          color: ${theme.ink};
          margin-top: 1.8em;
          margin-bottom: 0.6em;
          line-height: 1.3;
        }
        .article-content h2 { font-size: 26px; letter-spacing: -0.3px; }
        .article-content h3 { font-size: 22px; }
        .article-content h4 { font-size: 18px; }
        .article-content a {
          color: ${theme.accent};
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: ${theme.accentSoft};
          transition: text-decoration-color 0.15s ease-out;
        }
        .article-content a:hover {
          text-decoration-color: ${theme.accent};
        }
        .article-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1.5em 0;
          filter: saturate(0.7) contrast(1.05);
          border-radius: 3px;
        }
        .article-content blockquote {
          border-left: 3px solid ${theme.accent};
          margin: 1.5em 0;
          padding: 0.5em 0 0.5em 1.2em;
          color: ${theme.dim};
          font-style: italic;
        }
        .article-content ul,
        .article-content ol {
          padding-left: 1.5em;
          margin-bottom: 1.4em;
        }
        .article-content li {
          margin-bottom: 0.4em;
        }
        .article-content figure {
          margin: 1.5em 0;
        }
        .article-content figcaption {
          font-family: ${f.sans};
          font-size: 12px;
          color: ${theme.dim};
          margin-top: 8px;
          font-style: italic;
        }
        .article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
          font-size: 15px;
        }
        .article-content th,
        .article-content td {
          padding: 8px 12px;
          border-bottom: 1px solid ${theme.border};
          text-align: left;
        }
        .article-content th {
          font-family: ${f.sans};
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${theme.dim};
        }
        .article-content pre {
          background: ${theme.surface};
          padding: 16px;
          overflow-x: auto;
          margin: 1.5em 0;
          font-size: 14px;
        }
        .article-content code {
          background: ${theme.surface};
          padding: 2px 5px;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
}
