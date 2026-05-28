export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <img src="/vercel.png" alt="App logo" className="w-20 h-20 object-contain animate-pulse" />
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#FF7950] rounded-full animate-spin" />
        <div className="text-zinc-800 font-semibold">Loading…</div>
      </div>
    </div>
  );
}
