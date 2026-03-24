import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Search, Clock, ExternalLink, X, RefreshCw, Globe, Languages, Sun, Moon, Bookmark, List, LayoutGrid } from "lucide-react";
import { f, languages, uiStrings, countries, geoCountryMap } from "./shared/theme";
import { fetchAllFeeds, formatTime, cacheArticles, translateBatch, getCachedAllFeeds, getArticlesReadToday } from "./shared/utils";
import { Select, SkeletonRows, LoadingProgress } from "./shared/components";
import { useTheme } from "./shared/ThemeContext";
import { useBookmarks } from "./shared/useBookmarks";

// ─── Debounce Hook ───
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Article Row ───
function ArticleRow({ article, rank, t, translated, theme, focused, onBookmark, isBookmarked }) {
  const displayTitle = translated?.title || article.title;
  const displayDesc = translated?.description || article.description;
  const isTranslated = !!translated?.title;

  return (
    <Link to={`/article/${article.id}`} state={{ article }} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <article
        data-article-rank={rank}
        className="article-row"
        style={{
          display: "flex", gap: 14, padding: "20px 0",
          borderBottom: `1px solid ${theme.border}`,
          transition: "opacity 0.15s ease-out, background 0.15s ease-out",
          background: focused ? theme.surface : "transparent",
          marginLeft: -12, marginRight: -12, paddingLeft: 12, paddingRight: 12,
          borderRadius: focused ? 4 : 0,
        }}>

        <div style={{ width: 30, flexShrink: 0, paddingTop: 4, textAlign: "right" }}>
          <span style={{
            fontFamily: f.display, fontSize: rank >= 10 ? 20 : 26, lineHeight: 1,
            color: rank <= 3 ? theme.accent : theme.rule,
          }}>{rank}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontFamily: f.display, fontSize: 19, fontWeight: 400,
            color: theme.ink, lineHeight: 1.35, marginBottom: 5, letterSpacing: -0.1,
          }}>{displayTitle}</h3>
          {displayDesc && (
            <p style={{
              fontFamily: f.body, fontSize: 14, color: theme.dim, lineHeight: 1.6,
              marginBottom: 8, display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{displayDesc}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: f.sans, fontSize: 10, fontWeight: 600, color: theme.dim,
              textTransform: "uppercase", letterSpacing: 1.2,
            }}>{article.source}</span>
            {isTranslated && (
              <>
                <span style={{ color: theme.rule }} aria-hidden="true">·</span>
                <span style={{
                  fontFamily: f.sans, fontSize: 9, fontWeight: 600,
                  color: theme.accent, letterSpacing: 0.5,
                  display: "inline-flex", alignItems: "center", gap: 3,
                }}>
                  <Languages size={9} strokeWidth={1.5} /> {t.showTranslated || "Translated"}
                </span>
              </>
            )}
            {article.sourceCount > 1 && (
              <>
                <span style={{ color: theme.rule }} aria-hidden="true">·</span>
                <span style={{
                  fontFamily: f.sans, fontSize: 10, fontWeight: 600,
                  color: theme.accent, letterSpacing: 0.5,
                }}>{article.sourceCount} sources</span>
              </>
            )}
            {article.pubDate && (
              <>
                <span style={{ color: theme.rule }} aria-hidden="true">·</span>
                <span style={{
                  fontFamily: f.sans, fontSize: 11, color: theme.dim,
                  display: "inline-flex", alignItems: "center", gap: 3,
                }}>
                  <Clock size={10} strokeWidth={1.5} /> {formatTime(article.pubDate)}
                </span>
              </>
            )}
            <span style={{
              fontFamily: f.sans, fontSize: 11, color: theme.accent,
              display: "inline-flex", alignItems: "center", gap: 3,
              marginLeft: "auto", fontWeight: 500,
            }}>
              {t.readMore} <ExternalLink size={9} strokeWidth={1.5} />
            </span>
            {onBookmark && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onBookmark(article); }}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
                style={{
                  background: isBookmarked ? theme.accentSoft : "transparent",
                  border: `1px solid ${isBookmarked ? theme.accent : theme.border}`,
                  cursor: "pointer", padding: 0,
                  width: 26, height: 26, flexShrink: 0,
                  color: isBookmarked ? theme.accent : theme.dim,
                  transition: "all 0.15s ease-out",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={e => { if (!isBookmarked) { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; } }}
                onMouseLeave={e => { if (!isBookmarked) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; } }}
              >
                <Bookmark size={11} strokeWidth={1.5} fill={isBookmarked ? theme.accent : "none"} />
              </button>
            )}
          </div>
          {article.categories?.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {article.categories.map(cat => (
                <span key={cat} style={{
                  fontFamily: f.sans, fontSize: 9, fontWeight: 500,
                  color: theme.accent, letterSpacing: 0.3,
                  padding: "2px 6px", background: theme.accentSoft,
                  borderRadius: 2, textTransform: "lowercase",
                }}>{cat}</span>
              ))}
            </div>
          )}
        </div>

        {article.image && (
          <div className="article-thumb" style={{
            width: 120, height: 88, flexShrink: 0, overflow: "hidden",
            background: theme.surface, filter: "saturate(0.7) contrast(1.05)",
            borderRadius: 3,
          }}>
            <img src={article.image} alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={e => { e.target.parentElement.style.display = "none"; }} />
          </div>
        )}
      </article>
    </Link>
  );
}

// ─── Article Card (grid view) ───
function ArticleCard({ article, rank, t, translated, theme, onBookmark, isBookmarked, featured = false }) {
  const displayTitle = translated?.title || article.title;

  return (
    <Link to={`/article/${article.id}`} state={{ article }} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      <article
        className="article-card"
        style={{
          display: "flex", flexDirection: "column",
          height: "100%",
          border: `1px solid ${theme.border}`,
          background: theme.card,
          overflow: "hidden",
          transition: "opacity 0.15s ease-out, border-color 0.15s ease-out",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.borderColor = theme.rule; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.borderColor = theme.border; }}
      >
        {/* Image */}
        <div style={{
          width: "100%",
          aspectRatio: featured ? "16 / 7" : "16 / 10",
          overflow: "hidden",
          background: theme.surface,
          flexShrink: 0,
        }}>
          {article.image ? (
            <img src={article.image} alt="" loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(0.7) contrast(1.05)" }}
              onError={e => { e.target.parentElement.style.background = theme.surface; e.target.style.display = "none"; }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Globe size={20} strokeWidth={1} color={theme.border} />
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: featured ? "18px 20px 16px" : "14px 16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: f.display, fontSize: featured ? 15 : 13,
              color: rank <= 3 ? theme.accent : theme.rule, lineHeight: 1,
            }}>{rank}</span>
            <span style={{ color: theme.border }}>·</span>
            <span style={{
              fontFamily: f.sans, fontSize: 9, fontWeight: 600, color: theme.dim,
              textTransform: "uppercase", letterSpacing: 1.2,
            }}>{article.source}</span>
            {article.pubDate && (
              <>
                <span style={{ color: theme.border }}>·</span>
                <span style={{ fontFamily: f.sans, fontSize: 9, color: theme.dim, display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <Clock size={8} strokeWidth={1.5} /> {formatTime(article.pubDate)}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: f.display, fontSize: featured ? 22 : 17, fontWeight: 400,
            color: theme.ink, lineHeight: 1.3, letterSpacing: -0.1, flex: 1,
            display: "-webkit-box", WebkitLineClamp: featured ? 3 : 4,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{displayTitle}</h3>

          {/* Description — featured only */}
          {featured && article.description && (
            <p style={{
              fontFamily: f.body, fontSize: 13, color: theme.dim, lineHeight: 1.65,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{article.description}</p>
          )}

          {/* Footer row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 4 }}>
            <span style={{
              fontFamily: f.sans, fontSize: 10, color: theme.accent,
              display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 500,
            }}>
              {t.readMore} <ExternalLink size={8} strokeWidth={1.5} />
            </span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onBookmark(article); }}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
              style={{
                background: isBookmarked ? theme.accentSoft : "transparent",
                border: `1px solid ${isBookmarked ? theme.accent : theme.border}`,
                cursor: "pointer", padding: 0,
                width: 26, height: 26, flexShrink: 0,
                color: isBookmarked ? theme.accent : theme.dim,
                transition: "all 0.15s ease-out",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => { if (!isBookmarked) { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; } }}
              onMouseLeave={e => { if (!isBookmarked) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; } }}
            >
              <Bookmark size={11} strokeWidth={1.5} fill={isBookmarked ? theme.accent : "none"} />
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Detect country from timezone (synchronous, no network) ───
function detectCountryFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const tzCountryMap = {
      "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
      "America/Toronto": "CA", "America/Vancouver": "CA", "America/Mexico_City": "MX", "America/Sao_Paulo": "BR",
      "America/Argentina/Buenos_Aires": "AR", "America/Santiago": "CL", "America/Bogota": "CO",
      "America/Guayaquil": "EC", "America/Lima": "PE", "America/Caracas": "VE", "America/Havana": "CU",
      "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR", "Europe/Berlin": "DE",
      "Europe/Rome": "IT", "Europe/Madrid": "ES", "Europe/Lisbon": "PT", "Europe/Warsaw": "PL",
      "Europe/Kiev": "UA", "Europe/Istanbul": "TR", "Europe/Vienna": "AT", "Europe/Brussels": "BE",
      "Europe/Amsterdam": "NL", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
      "Europe/Helsinki": "FI", "Europe/Athens": "GR", "Europe/Prague": "CZ", "Europe/Bucharest": "RO",
      "Europe/Budapest": "HU", "Europe/Zagreb": "HR", "Europe/Belgrade": "RS", "Europe/Moscow": "RU",
      "Europe/Zurich": "CH",
      "Asia/Tokyo": "JP", "Asia/Shanghai": "CN", "Asia/Kolkata": "IN", "Asia/Seoul": "KR",
      "Asia/Jakarta": "ID", "Asia/Manila": "PH", "Asia/Singapore": "SG", "Asia/Dubai": "AE",
      "Asia/Riyadh": "SA", "Asia/Jerusalem": "IL", "Asia/Kabul": "AF", "Asia/Dhaka": "BD",
      "Asia/Kuala_Lumpur": "MY", "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN", "Asia/Taipei": "TW",
      "Asia/Karachi": "PK", "Asia/Kathmandu": "NP", "Asia/Colombo": "LK", "Asia/Rangoon": "MM",
      "Asia/Phnom_Penh": "KH", "Asia/Baghdad": "IQ", "Asia/Amman": "JO", "Asia/Kuwait": "KW",
      "Asia/Beirut": "LB", "Asia/Muscat": "OM", "Asia/Qatar": "QA", "Asia/Damascus": "SY",
      "Asia/Almaty": "KZ", "Asia/Baku": "AZ", "Asia/Tbilisi": "GE", "Asia/Tashkent": "UZ",
      "Asia/Aden": "YE",
      "Australia/Sydney": "AU", "Pacific/Auckland": "NZ",
      "Africa/Lagos": "NG", "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG", "Africa/Nairobi": "KE",
      "Africa/Algiers": "DZ", "Africa/Addis_Ababa": "ET", "Africa/Accra": "GH", "Africa/Casablanca": "MA",
      "Africa/Tunis": "TN", "Africa/Khartoum": "SD", "Africa/Dar_es_Salaam": "TZ", "Africa/Kampala": "UG",
      "Africa/Harare": "ZW", "Africa/Douala": "CM", "Africa/Kinshasa": "CD", "Africa/Tripoli": "LY",
    };
    const code = tzCountryMap[tz];
    if (code && geoCountryMap[code]) return geoCountryMap[code];
  } catch { /* ignore */ }
  return null;
}

// ─── Resolve initial country: URL param > sessionStorage > geo-detect > ALL ───
function resolveInitialCountry(searchParams) {
  return searchParams.get("country")
    || sessionStorage.getItem("atlas-country")
    || detectCountryFromTimezone()
    || "ALL";
}

// ─── Main ───
export default function AtlasReport({ onShowIntro }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCountry = resolveInitialCountry(searchParams);
  const initialLang = searchParams.get("lang") || sessionStorage.getItem("atlas-lang") || "en";

  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLang);
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedSources, setFeedSources] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("atlas-view-mode") || "list");
  const [showSaved, setShowSaved] = useState(false);
  const [articlesReadToday] = useState(getArticlesReadToday);
  const translationRef = useRef({ lang: "en", ids: "" });
  const searchInputRef = useRef(null);
  const { bookmarks, toggle: toggleBookmark, isBookmarked } = useBookmarks();

  const t = { ...uiStrings.en, ...(uiStrings[selectedLanguage] || {}) };

  // Persist view mode
  useEffect(() => { localStorage.setItem("atlas-view-mode", viewMode); }, [viewMode]);

  // Scroll to top on mount (back navigation)
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 200);

  // ─── Collapsing header on scroll ───
  useEffect(() => {
    let lastY = window.scrollY;
    let accumulated = 0;
    const THRESHOLD = 40; // px of consistent scroll direction before toggling

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;

      // Near top: always show full header
      if (y < 100) { accumulated = 0; setHeaderCollapsed(false); return; }

      // Accumulate scroll in one direction; reset if direction changes
      if ((accumulated > 0 && delta < 0) || (accumulated < 0 && delta > 0)) {
        accumulated = delta;
      } else {
        accumulated += delta;
      }

      if (accumulated > THRESHOLD) setHeaderCollapsed(true);
      else if (accumulated < -THRESHOLD) setHeaderCollapsed(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Translate visible articles when language changes
  useEffect(() => {
    if (selectedLanguage === "en" || loading || !articles.length) {
      setTranslations({}); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const visible = articles.slice(0, visibleCount);
    const refKey = `${selectedLanguage}:${visible.map(a => a.id).join(",")}`;
    if (translationRef.current.lang === selectedLanguage && translationRef.current.ids === refKey) return;
    translationRef.current = { lang: selectedLanguage, ids: refKey };

    let cancelled = false;
    setTranslating(true);

    (async () => {
      const titles = visible.map(a => a.title);
      const descs = visible.map(a => a.description || "");
      const [trTitles, trDescs] = await Promise.all([
        translateBatch(titles, selectedLanguage),
        translateBatch(descs, selectedLanguage),
      ]);

      if (cancelled) return;
      const map = {};
      visible.forEach((a, i) => {
        map[a.id] = { title: trTitles[i], description: trDescs[i] };
      });
      setTranslations(prev => ({ ...prev, ...map }));
      setTranslating(false);
    })();

    return () => { cancelled = true; };
  }, [selectedLanguage, articles, visibleCount, loading]);

  // Sync URL search params, html lang, and sessionStorage
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCountry !== "ALL") params.set("country", selectedCountry);
    if (selectedLanguage !== "en") params.set("lang", selectedLanguage);
    setSearchParams(params, { replace: true });
    document.documentElement.lang = selectedLanguage;
    sessionStorage.setItem("atlas-country", selectedCountry);
    sessionStorage.setItem("atlas-lang", selectedLanguage);
  }, [selectedCountry, selectedLanguage, setSearchParams]);

  const fetchNews = useCallback(async (countryCode, forceRefresh = false) => {
    const code = countryCode || selectedCountry;
    setVisibleCount(10);
    setFocusedIdx(-1);
    const country = countries.find(ct => ct.code === code);
    if (!country) return;
    setFeedSources(country.feeds.map(fd => fd.name));

    // Show cached data instantly (no skeleton flash)
    const cached = !forceRefresh && getCachedAllFeeds(code);
    if (cached && cached.length > 0) {
      setArticles(cached);
      cacheArticles(cached);
      setLoading(false);
      // Refresh in background silently
      fetchAllFeeds(country.feeds, code).then(fresh => {
        if (fresh.length > 0) {
          setArticles(fresh);
          cacheArticles(fresh);
        }
      });
    } else {
      setLoading(true);
      const data = await fetchAllFeeds(country.feeds, code);
      setArticles(data);
      cacheArticles(data);
      setLoading(false);
    }
  }, [selectedCountry]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchNews(); }, [fetchNews]);

  const filteredArticles = useMemo(() => {
    if (!debouncedSearch) return articles;
    const q = debouncedSearch.toLowerCase();
    return articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.source.toLowerCase().includes(q) ||
      a.categories?.some(c => c.toLowerCase().includes(q))
    );
  }, [articles, debouncedSearch]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const onKey = (e) => {
      // Don't capture when typing in input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          e.target.blur();
          setFocusedIdx(-1);
        }
        return;
      }

      const max = Math.min(visibleCount, filteredArticles.length) - 1;

      switch (e.key) {
        case "j":
          e.preventDefault();
          setFocusedIdx(prev => {
            const next = Math.min(prev + 1, max);
            // Scroll focused article into view
            setTimeout(() => {
              const el = document.querySelector(`[data-article-rank="${next + 1}"]`);
              el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }, 10);
            return next;
          });
          break;
        case "k":
          e.preventDefault();
          setFocusedIdx(prev => {
            const next = Math.max(prev - 1, 0);
            setTimeout(() => {
              const el = document.querySelector(`[data-article-rank="${next + 1}"]`);
              el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }, 10);
            return next;
          });
          break;
        case "Enter":
          if (focusedIdx >= 0 && focusedIdx <= max) {
            e.preventDefault();
            const article = filteredArticles[focusedIdx];
            navigate(`/article/${article.id}`, { state: { article } });
          }
          break;
        case "/":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case "Escape":
          setFocusedIdx(-1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredArticles, visibleCount, focusedIdx, navigate]);

  const countryData = countries.find(ct => ct.code === selectedCountry);

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", fontFamily: f.body, transition: "background 0.3s ease" }}>

      {/* ─── Masthead ─── */}
      <header className={headerCollapsed ? "header-collapsed" : ""} style={{
        background: theme.bg, position: "sticky", top: 0, zIndex: 50,
        borderBottom: `1px solid ${theme.border}`,
        transition: "all 0.25s ease-out",
      }}>
        <div className="header-inner" style={{
          maxWidth: 720, margin: "0 auto",
          padding: headerCollapsed ? "10px 24px" : "20px 24px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
          transition: "padding 0.25s ease-out",
        }}>
          <div
            onClick={onShowIntro}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onShowIntro?.(); } }}
            style={{
              display: "flex", alignItems: "center", gap: 10, minWidth: 0,
              animation: "headerItemIn 0.6s 0.05s cubic-bezier(0.16, 1, 0.3, 1) both",
              cursor: "pointer",
            }}
          >
            <Globe className="header-globe" size={headerCollapsed ? 18 : 24} strokeWidth={1.3} color={theme.ink}
              style={{ flexShrink: 0, transition: "all 0.25s ease-out" }} />
            <div style={{ minWidth: 0 }}>
              <h1 className="header-title" style={{
                fontFamily: f.display,
                fontSize: headerCollapsed ? 20 : 32,
                fontWeight: 400,
                color: theme.ink, lineHeight: 1, letterSpacing: -0.5,
                transition: "font-size 0.25s ease-out",
                whiteSpace: "nowrap",
              }}>
                World News Reports
              </h1>
              {!headerCollapsed && (
                <p className="header-subtitle" style={{
                  fontFamily: f.sans, fontSize: 10, fontWeight: 500,
                  color: theme.dim, letterSpacing: 2, textTransform: "uppercase", marginTop: 6,
                }}>Worldwide news, one report at a time</p>
              )}
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            animation: "headerItemIn 0.6s 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}>
            {/* Globe Map link — accent-styled to catch the eye */}
            <Link to="/globe" style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 11px",
              border: `1px solid ${theme.accent}`,
              background: isDark ? "rgba(196,106,106,0.10)" : "rgba(122,46,46,0.07)",
              textDecoration: "none",
              fontFamily: f.sans, fontSize: 10, fontWeight: 600,
              color: theme.accent, letterSpacing: 0.4,
              transition: "all 0.2s ease-out",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.accent
                e.currentTarget.style.color = theme.bg
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isDark ? "rgba(196,106,106,0.10)" : "rgba(122,46,46,0.07)"
                e.currentTarget.style.color = theme.accent
              }}>
              <Globe size={11} strokeWidth={1.5} />
              <span className="header-btn-label">Globe Map</span>
            </Link>
            {/* Day/Night toggle */}
            <button onClick={toggleTheme} aria-label={isDark ? t.dayEdition : t.nightEdition} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
              border: `1px solid ${theme.border}`, background: "transparent",
              cursor: "pointer", fontFamily: f.sans, fontSize: 10,
              fontWeight: 500, color: theme.dim, transition: "all 0.15s ease-out",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; }}>
              {isDark ? <Sun size={10} strokeWidth={1.5} /> : <Moon size={10} strokeWidth={1.5} />}
              <span className="header-btn-label">{isDark ? t.dayEdition : t.nightEdition}</span>
            </button>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 8px", border: `1px solid ${theme.border}`,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: theme.accent, animation: "pulse 2s infinite",
              }} />
              <span style={{
                fontFamily: f.sans, fontSize: 9, fontWeight: 600,
                color: theme.dim, letterSpacing: 1.5,
              }}>{t.liveLabel}</span>
            </div>
            <button onClick={() => fetchNews(undefined, true)} aria-label={t.refresh} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
              border: `1px solid ${theme.border}`, background: "transparent",
              cursor: "pointer", fontFamily: f.sans, fontSize: 10,
              fontWeight: 500, color: theme.dim, transition: "all 0.15s ease-out",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; }}>
              <RefreshCw size={10} strokeWidth={1.5} /> <span className="header-btn-label">{t.refresh}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Toolbar ─── */}
      <nav style={{
        background: theme.bg, borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{
          maxWidth: 720, margin: "0 auto", padding: "10px 24px",
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        }}>
          <Select value={selectedCountry} onChange={v => { setSelectedCountry(v); setFocusedIdx(-1); }}
            options={countries} label={t.selectCountry} theme={theme} searchable
            renderOption={(o) => (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{o?.flag}</span>
                <span>{o?.name}</span>
              </span>
            )} />
          <Select value={selectedLanguage} onChange={setSelectedLanguage}
            options={languages.map(l => ({ ...l, id: l.code }))}
            label={t.language} theme={theme} searchable
            renderOption={(o) => (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{o?.native}</span>
                {o?.name !== o?.native && <span style={{ color: theme.dim, fontSize: 11 }}>({o?.name})</span>}
              </span>
            )} />
          <div style={{ flex: 1, position: "relative", minWidth: 100 }}>
            <Search size={13} strokeWidth={1.5} color={theme.dim}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input ref={searchInputRef} type="text" placeholder={`${t.search} ( / )`} value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setVisibleCount(10); setFocusedIdx(-1); }}
              aria-label={t.search}
              style={{
                width: "100%", padding: "7px 28px 7px 30px",
                border: `1px solid ${theme.border}`, background: "transparent",
                fontFamily: f.sans, fontSize: 13, color: theme.text, outline: "none",
                transition: "border-color 0.15s ease-out",
              }}
              onFocus={e => e.target.style.borderColor = theme.ink}
              onBlur={e => e.target.style.borderColor = theme.border} />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setFocusedIdx(-1); }} aria-label={t.close} style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "opacity 0.15s ease-out",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.6"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                <X size={12} color={theme.dim} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Content ─── */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ padding: "28px 0 0" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            paddingBottom: 12, borderBottom: `1px solid ${theme.border}`,
          }}>
            {/* Title + country */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: 1, flexWrap: "wrap" }}>
              <h2 style={{
                fontFamily: f.display, fontSize: 28, fontWeight: 400,
                color: showSaved ? theme.dim : theme.ink, letterSpacing: -0.3,
                cursor: showSaved ? "pointer" : "default", transition: "color 0.15s",
              }}
                onClick={() => setShowSaved(false)}
              >{t.trending}</h2>
              {showSaved && (
                <span style={{
                  fontFamily: f.display, fontSize: 28, fontWeight: 400,
                  color: theme.ink, letterSpacing: -0.3,
                }}>· Saved</span>
              )}
              {!showSaved && selectedCountry !== "ALL" && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontFamily: f.body, color: theme.dim, fontStyle: "normal", fontSize: 16 }}>in</span>
                  <span style={{ fontSize: 16 }}>{countryData?.flag}</span>
                  <span style={{ fontFamily: f.display, fontSize: 20, color: theme.ink }}>{countryData?.name}</span>
                </span>
              )}
            </div>

            {/* Right controls: stats + saved + view toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexShrink: 0 }}>
              {/* Articles read today */}
              {articlesReadToday > 0 && !showSaved && (
                <span style={{
                  fontFamily: f.sans, fontSize: 10, color: theme.rule, fontWeight: 500,
                }}>
                  {articlesReadToday} read today
                </span>
              )}

              {/* Translating indicator */}
              {!loading && translating && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4, color: theme.accent,
                  fontFamily: f.sans, fontSize: 11,
                }}>
                  <Languages size={11} strokeWidth={1.5} style={{ animation: "pulse 1.5s infinite" }} />
                  {t.translating || "Translating…"}
                </span>
              )}

              {/* Article count */}
              {!loading && (
                <span aria-live="polite" style={{
                  fontFamily: f.sans, fontSize: 11, color: theme.dim, fontWeight: 500,
                }}>
                  {showSaved ? bookmarks.length : filteredArticles.length} articles
                </span>
              )}

              {/* Saved toggle */}
              <button
                onClick={() => setShowSaved(v => !v)}
                aria-label={showSaved ? "Back to feed" : "Show saved articles"}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 8px", border: `1px solid ${showSaved ? theme.accent : theme.border}`,
                  background: showSaved ? theme.accentSoft : "transparent",
                  cursor: "pointer", fontFamily: f.sans, fontSize: 9, fontWeight: 600,
                  color: showSaved ? theme.accent : theme.dim,
                  letterSpacing: 0.8, textTransform: "uppercase",
                  transition: "all 0.15s ease-out",
                }}
                onMouseEnter={e => { if (!showSaved) { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; } }}
                onMouseLeave={e => { if (!showSaved) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; } }}
              >
                <Bookmark size={10} strokeWidth={1.5} fill={showSaved ? theme.accent : "none"} />
                {bookmarks.length > 0 && <span>{bookmarks.length}</span>}
              </button>

              {/* View toggle */}
              <div style={{ display: "flex", gap: 2 }}>
                {[
                  { mode: "list", Icon: List },
                  { mode: "grid", Icon: LayoutGrid },
                ].map(({ mode, Icon }) => (
                  <button key={mode}
                    onClick={() => setViewMode(mode)}
                    aria-label={`${mode} view`}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 26, height: 26,
                      border: `1px solid ${viewMode === mode ? theme.ink : theme.border}`,
                      background: viewMode === mode ? theme.ink : "transparent",
                      cursor: "pointer",
                      color: viewMode === mode ? theme.bg : theme.dim,
                      transition: "all 0.15s ease-out",
                    }}
                    onMouseEnter={e => { if (viewMode !== mode) { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; } }}
                    onMouseLeave={e => { if (viewMode !== mode) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; } }}
                  >
                    <Icon size={12} strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {feedSources.length > 0 && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 0", flexWrap: "wrap" }}>
              <span style={{
                fontFamily: f.sans, fontSize: 10, color: theme.dim,
                fontWeight: 600, textTransform: "uppercase", letterSpacing: 1,
              }}>{t.sources}:</span>
              {feedSources.map((s, i) => (
                <span key={s} style={{
                  fontFamily: f.sans, fontSize: 10, color: theme.dim,
                  fontWeight: 400, fontStyle: "normal",
                }}>{s}{i < feedSources.length - 1 ? "," : ""}</span>
              ))}
            </div>
          )}
        </div>

        {/* Articles or skeleton */}
        {loading && !showSaved ? (
          <>
            <LoadingProgress theme={theme} />
            <SkeletonRows theme={theme} />
          </>
        ) : (() => {
          // Determine which list to render
          const displayList = showSaved ? bookmarks : filteredArticles;

          if (displayList.length === 0) {
            return (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                {showSaved ? (
                  <>
                    <Bookmark size={32} strokeWidth={1} color={theme.rule} style={{ marginBottom: 16 }} />
                    <p style={{ fontFamily: f.display, fontSize: 20, color: theme.ink, marginBottom: 6 }}>No saved articles</p>
                    <p style={{ fontFamily: f.body, fontSize: 14, color: theme.dim, fontStyle: "normal" }}>
                      Bookmark articles to read them later
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: f.display, fontSize: 20, color: theme.ink, marginBottom: 6 }}>{t.noResults}</p>
                    <p style={{ fontFamily: f.body, fontSize: 14, color: theme.dim, fontStyle: "normal" }}>{t.tryAgain}</p>
                  </>
                )}
              </div>
            );
          }

          const visibleList = showSaved ? displayList : displayList.slice(0, visibleCount);

          if (viewMode === "grid") {
            // ─── Grid layout ───
            const [featured, ...rest] = visibleList;
            return (
              <div style={{ paddingTop: 20 }}>
                {/* Featured — rank 1, full width */}
                {featured && (
                  <div style={{ marginBottom: 16 }}>
                    <ArticleCard
                      article={featured} rank={1} t={t} theme={theme} featured
                      translated={selectedLanguage !== "en" ? translations[featured.id] : null}
                      onBookmark={toggleBookmark} isBookmarked={isBookmarked(featured.id)}
                    />
                  </div>
                )}
                {/* 3-column grid for rest */}
                {rest.length > 0 && (
                  <div className="articles-grid" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 16,
                  }}>
                    {rest.map((article, i) => (
                      <ArticleCard
                        key={article.id} article={article} rank={i + 2} t={t} theme={theme}
                        translated={selectedLanguage !== "en" ? translations[article.id] : null}
                        onBookmark={toggleBookmark} isBookmarked={isBookmarked(article.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // ─── List layout ───
          return (
            <div>
              {visibleList.map((article, i) => (
                <ArticleRow key={article.id} article={article} rank={i + 1} t={t}
                  theme={theme} focused={!showSaved && i === focusedIdx}
                  translated={selectedLanguage !== "en" ? translations[article.id] : null}
                  onBookmark={toggleBookmark} isBookmarked={isBookmarked(article.id)} />
              ))}
            </div>
          );
        })()}

        {/* Load more (feed list mode only) */}
        {!showSaved && !loading && viewMode === "list" && visibleCount < filteredArticles.length && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <button onClick={() => setVisibleCount(prev => prev + 6)} style={{
              fontFamily: f.sans, fontSize: 10, fontWeight: 600,
              padding: "6px 16px", border: `1px solid ${theme.border}`,
              background: "transparent", color: theme.dim,
              cursor: "pointer", transition: "all 0.15s ease-out",
              letterSpacing: 0.8, textTransform: "uppercase",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; }}>
              {t.loadMore}
            </button>
            <p style={{ fontFamily: f.sans, fontSize: 10, color: theme.rule, marginTop: 8, fontWeight: 500 }}>
              {t.showing} {Math.min(visibleCount, filteredArticles.length)} / {filteredArticles.length}
            </p>
          </div>
        )}

        {/* Grid load more */}
        {!showSaved && !loading && viewMode === "grid" && visibleCount < filteredArticles.length && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <button onClick={() => setVisibleCount(prev => prev + 6)} style={{
              fontFamily: f.sans, fontSize: 10, fontWeight: 600,
              padding: "6px 16px", border: `1px solid ${theme.border}`,
              background: "transparent", color: theme.dim,
              cursor: "pointer", transition: "all 0.15s ease-out",
              letterSpacing: 0.8, textTransform: "uppercase",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.ink; e.currentTarget.style.color = theme.ink; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.dim; }}>
              {t.loadMore}
            </button>
          </div>
        )}

        {/* End of feed rule */}
        {!loading && (() => {
          const list = showSaved ? bookmarks : filteredArticles;
          const shown = showSaved ? list.length : Math.min(visibleCount, list.length);
          return list.length > 0 && (showSaved || shown >= list.length) ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 1, background: theme.rule }} />
                <span style={{ fontFamily: f.sans, fontSize: 10, color: theme.dim, fontWeight: 500 }}>
                  {list.length} articles
                </span>
                <div style={{ width: 32, height: 1, background: theme.rule }} />
              </div>
            </div>
          ) : null;
        })()}

        {/* Keyboard shortcuts hint — hidden on mobile via CSS */}
        {!loading && filteredArticles.length > 0 && (
          <div className="keyboard-hints" style={{
            textAlign: "center", padding: "8px 0 24px",
            fontFamily: f.sans, fontSize: 10, color: theme.rule,
          }}>
            <kbd style={{ padding: "1px 4px", background: theme.surface, borderRadius: 2, fontSize: 9 }}>j</kbd>
            {" / "}
            <kbd style={{ padding: "1px 4px", background: theme.surface, borderRadius: 2, fontSize: 9 }}>k</kbd>
            {" navigate · "}
            <kbd style={{ padding: "1px 4px", background: theme.surface, borderRadius: 2, fontSize: 9 }}>Enter</kbd>
            {" open · "}
            <kbd style={{ padding: "1px 4px", background: theme.surface, borderRadius: 2, fontSize: 9 }}>/</kbd>
            {" search"}
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: `1px solid ${theme.border}`, padding: "16px 24px", marginTop: 48 }}>
        <div style={{
          maxWidth: 720, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: f.display, fontSize: 15, color: theme.ink, display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={14} strokeWidth={1.3} color={theme.ink} />
            World News Reports
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="https://instagram.com/safe_rill" target="_blank" rel="noopener noreferrer" style={{ fontFamily: f.sans, fontSize: 10, color: theme.dim, fontWeight: 500, textDecoration: "none", transition: "color 0.15s ease-out", display: "flex", alignItems: "center", gap: 4 }} onMouseEnter={e => e.currentTarget.style.color = theme.accent} onMouseLeave={e => e.currentTarget.style.color = theme.dim}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Instagram
            </a>
            <a href="https://tiktok.com/@safe_rill" target="_blank" rel="noopener noreferrer" style={{ fontFamily: f.sans, fontSize: 10, color: theme.dim, fontWeight: 500, textDecoration: "none", transition: "color 0.15s ease-out" }} onMouseEnter={e => e.currentTarget.style.color = theme.ink} onMouseLeave={e => e.currentTarget.style.color = theme.dim}>Tiktok</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
