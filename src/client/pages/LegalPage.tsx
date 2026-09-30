import type { ReactNode } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { sitePageClass } from "@/components/layout/styles";
import { cn } from "@/lib/utils";

export default function LegalPage({ children }: { children: ReactNode }) {
    return (
        <div className={cn(sitePageClass, "print:bg-white print:text-[#111]")}>
            <Header />
            {children}
            <Footer />
        </div>
    );
}
