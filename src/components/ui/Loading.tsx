export function Loading({ text = "読み込み中..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-gray-400 dark:text-gray-500">
      <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
