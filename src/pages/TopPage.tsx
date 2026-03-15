import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLayout } from "../contexts/LayoutContext";

const DESCRIPTION_SECTIONS = [
  {
    heading: "このサービスについて",
    body: "この掲示板は、Cloudflare Workers 上で動いている匿名掲示板です。",
  },
  {
    heading: null,
    body: "日本のインターネットには、2ch やしたらば、ふたばなど、昔からいろいろな掲示板文化があります。自分もそういう文化がけっこう好きで、今でもたまに覗いたりしています。ただ、「WEBブラウザで普通に使うにはちょっと不便だな」と感じることも多く、専用ブラウザを使う前提になっている場面も多い気がしています。",
  },
  {
    heading: null,
    body: "Cloudflare Workers 上で動く掲示板も最近は登場していますが、「WEB UIがもう少し使いやすかったらいいのにな」とずっと思っていました。そんなとき Claude Code を触ってみたら思っていた以上に強力で、「これなら自分でも作れるかも？」と思い、試しに作ってみたのがこの掲示板です。",
  },
  {
    heading: null,
    body: "日本の匿名掲示板文化が少しずつ元気を失っているように見えるのは、個人的には少しさみしく感じることもあります。子供の頃に思い描いていたような「気軽に書き込める匿名掲示板」の雰囲気を、今の技術で作ったらどうなるだろう——そんな気持ちもありました。",
  },
  {
    heading: null,
    body: "2ch 系掲示板のインターフェースとの互換性はある程度残しつつ、WEBブラウザだけでも普通に使えること、そして将来的に機能を追加していけるような形を目指しています。",
  },
  {
    heading: "オープンソース",
    body: "このソフトウェアは MIT ライセンスのオープンソースとして GitHub で公開しています。誰でも自由に動かしたり、改造したり、別の掲示板を作ったりできます。",
  },
  {
    heading: null,
    body: "ここが大きなコミュニティになるとはあまり思っていませんが、私の技術的なアウトプット場所、ブログ的な使い方もできればいいなと思っています。何かあったときのちょっとした避難所みたいな場所になれば嬉しいです。なんにしても個人開発サービスの域を出ないので、いつなくなってもいいや、くらいの気持ちで運営して行きます。",
  },
];

const FEATURES = [
  { icon: "🌐", title: "ブラウザだけで使えることを目指しています。", desc: "専用アプリ不要。スマホ・PCどちらでもブラウザから使えるようにアップデートしていきます。" },
  { icon: "🙈", title: "匿名で投稿できる", desc: "登録不要で書き込み可能。アカウントを作れば、書き込める板が増えるのと、IDが付与されます。" },
  { icon: "🔓", title: "MITライセンス", desc: "ソースコードは GitHub で公開。自由に使用・改造・再配布できます。" },
];

const FOOTER_LINKS = [
  { label: "GitHub", href: "https://github.com/yumekui8/hono-bbs/", external: true },
  { label: "問い合わせ", href: "/boards/inquriy", external: false },
  { label: "管理者ブログ", href: "/boards/admin-blog", external: false },
];

export function TopPage() {
  const { isLoggedIn } = useAuth();
  const { setSidebarOpen } = useLayout();

  // トップ画面ではサイドバーを閉じる
  useEffect(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
          Cloudflare Workers で動く匿名掲示板
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
          hono<span className="text-blue-600 dark:text-blue-400">-bbs</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-10 leading-relaxed">
          ブラウザだけで使える、今どきの匿名掲示板。<br />
          登録なしで書き込み、好きなときに覗ける場所。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/boards"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors w-full sm:w-auto"
          >
            板一覧を見る
            <span className="text-blue-200">›</span>
          </Link>
          {!isLoggedIn && (
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full sm:w-auto"
            >
              ログインして始める
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          ログインなしで閲覧・書き込みができます
        </p>
      </section>

      {/* Features */}
      <section className="py-12 border-t border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col items-start gap-3 p-5 border border-gray-100 dark:border-gray-800 bg-[var(--bg-surface)]">
              <span className="text-2xl leading-none">{f.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{f.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="py-12 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto space-y-7">
          {DESCRIPTION_SECTIONS.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  {section.heading}
                </h2>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          さっそく書き込んでみませんか
        </p>
        <Link
          to="/boards"
          className="inline-flex items-center gap-2 px-8 py-3 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          掲示板を見る
        </Link>
      </section>

      {/* サイトフッター */}
      <footer className="py-6 border-t border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {link.label} ↗
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
        </div>
      </footer>
    </div>
  );
}
