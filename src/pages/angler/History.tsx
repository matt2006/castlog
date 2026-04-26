export function History() {
  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top,0)+1.25rem)] pb-5 space-y-4">
      <h1 className="text-[22px] font-extrabold text-angler-text tracking-tight">
        History
      </h1>

      <div className="bg-angler-white rounded-[18px] border border-angler-border py-16 flex flex-col items-center gap-1.5">
        <span className="text-5xl mb-1.5" aria-hidden>📋</span>
        <p className="text-angler-text2 text-[15px] font-semibold">Coming soon</p>
        <p className="text-angler-text3 text-[13px]">Your full fishing history will appear here.</p>
      </div>
    </div>
  )
}
