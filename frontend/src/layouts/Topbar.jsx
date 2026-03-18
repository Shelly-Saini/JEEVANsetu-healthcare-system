export default function Topbar({ onToggleSidebar, darkMode, onToggleDark, title }) {
  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          ☰
        </button>
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
          title="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
          CA
        </div>
      </div>
    </header>
  );
}
