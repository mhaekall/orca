export default function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#13111a] pb-24 text-white overflow-y-auto no-scrollbar">
      {/* Hero */}
      <div className="w-full h-[450px] md:h-[500px] relative bg-[#1f1c29] animate-pulse">
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #13111a, rgba(19, 17, 26, 0.4) 50%, rgba(19, 17, 26, 0))" }} />
        <div className="absolute inset-x-0 bottom-0 h-[250px]" style={{ background: "linear-gradient(to top, #13111a, rgba(19, 17, 26, 0.8) 50%, rgba(19, 17, 26, 0))" }} />
        <div className="absolute inset-x-0 bottom-0 h-[100px]" style={{ background: "linear-gradient(to top, #13111a, rgba(19, 17, 26, 0))" }} />
        <div className="absolute top-10 left-5 w-9 h-9 bg-[#2a2536] rounded-full" />
      </div>

      <div className="px-5 md:px-8 -mt-[200px] md:-mt-[240px] relative z-10 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-8">
          <div className="flex-1 min-w-0 animate-pulse">
            <div className="h-10 w-3/4 bg-[#2a2536] rounded-xl mb-3" />
            <div className="h-4 w-1/2 bg-[#2a2536] rounded-lg mb-6" />
            
            <div className="flex gap-2 mb-6">
              <div className="h-4 w-16 bg-[#2a2536] rounded-full" />
              <div className="h-4 w-16 bg-[#2a2536] rounded-full" />
              <div className="h-4 w-16 bg-[#2a2536] rounded-full" />
            </div>
            
            <div className="flex gap-2">
              <div className="h-12 w-40 bg-[#2a2536] rounded-2xl" />
              <div className="h-12 w-12 bg-[#2a2536] rounded-2xl" />
              <div className="h-12 w-12 bg-[#2a2536] rounded-2xl" />
            </div>
          </div>
        </div>

        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#1f1c29] h-16 rounded-2xl border border-white/5" />
            ))}
          </div>

          <div className="space-y-3">
            <div className="h-5 w-32 bg-[#2a2536] rounded-lg" />
            <div className="h-4 w-full bg-[#1f1c29] rounded-lg" />
            <div className="h-4 w-full bg-[#1f1c29] rounded-lg" />
            <div className="h-4 w-2/3 bg-[#1f1c29] rounded-lg" />
          </div>

          <div className="space-y-4">
            <div className="h-5 w-24 bg-[#2a2536] rounded-lg" />
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
               {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="bg-[#1f1c29] h-10 rounded-xl border border-white/5" />
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
