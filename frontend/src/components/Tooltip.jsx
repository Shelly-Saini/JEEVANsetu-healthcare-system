// Tooltip — wraps any child, shows text above on hover
// Usage: <Tooltip text="Your hint"><button>...</button></Tooltip>
export default function Tooltip({ text, children }) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] text-center px-2 py-1 rounded-md bg-gray-900 text-white text-xs leading-snug shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-normal">
        {text}
        {/* arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
