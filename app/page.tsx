import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-2xl font-bold">
          VRoom <span className="text-blue-400">AI</span>
        </Link>

        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-500"
        >
          Open Dashboard
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto flex min-h-[80vh] max-w-7xl items-center px-6 py-20">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm text-blue-300">
            AI-powered career preparation
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            Practice.
            <br />
            Improve.
            <br />
            <span className="text-blue-400">Get hired.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300">
            VRoom AI helps you analyze your resume, practice realistic mock
            interviews, improve your communication, and prepare for your next
            career opportunity.
          </p>

          <div className="mt-10">
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-center font-semibold transition hover:bg-blue-500"
            >
              Start practicing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}