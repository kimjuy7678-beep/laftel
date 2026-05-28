
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickMenu from "@/components/QuickMenu";
import ScheduleMarquee from "@/components/ScheduleMarquee";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            <main>{children}</main>
            <div className="fixed bottom-0 left-0 z-50 w-full bg-[#000]">
                <ScheduleMarquee />
            </div>
            <Footer />
            <QuickMenu />
        </>
    );
}