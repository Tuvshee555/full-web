"use client";

type Props = {
  page: number;
  setPage: (p: number) => void;
};

export const PageTabs = ({ page, setPage }: Props) => {
  return (
    <div className="h-[44px] w-full bg-[#1a1a1a] p-1 gap-2 rounded-full flex border border-gray-800">
      <div
        className={`w-full h-full rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-all duration-300 ${
          page === 1
            ? "bg-gradient-to-r from-[#facc15] to-[#fbbf24] text-black"
            : "text-gray-300 hover:text-[#facc15]"
        }`}
        onClick={() => setPage(1)}
      >
        Cart
      </div>

      <div
        className={`w-full h-full rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-all duration-300 ${
          page === 2
            ? "bg-gradient-to-r from-[#facc15] to-[#fbbf24] text-black"
            : "text-gray-300 hover:text-[#facc15]"
        }`}
        onClick={() => setPage(2)}
      >
        Orders
      </div>
    </div>
  );
};
